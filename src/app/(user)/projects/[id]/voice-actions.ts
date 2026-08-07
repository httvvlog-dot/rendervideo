"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { ProviderRuntime } from "@/utils/provider-runtime"
import { MediaService } from "@/utils/media/MediaService"
import { ReferenceManager } from "@/utils/media/ReferenceManager"
import { ElevenLabsAdapter } from "@/utils/provider-runtime/adapters/elevenlabs-adapter"
import * as mm from 'music-metadata'
import crypto from 'crypto'
import { revalidatePath } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"



export type GenerateVoiceResult =
  | {
      success: true
      generatedCount: number
      skippedCount: number
      failedSections: Array<{
        sectionId: string
        sectionIndex: number
        error: string
      }>
    }
  | {
      success: false
      code: string
      message: string
      rawError?: any
    }

export async function generateMissingProjectVoice(projectId: string, voicePresetId?: string, forceRegenerate: boolean = false, overrideSupabase?: SupabaseClient): Promise<GenerateVoiceResult> {
  const TRACE_ID = `GV-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${crypto.randomBytes(4).toString('hex')}`;
  const isDiagnostic = process.env.VOICE_DIAGNOSTIC_MODE === 'true';

  console.log(`\n==================================================`);
  console.log(`TRACE_ID: ${TRACE_ID}`);
  console.log(`Project: ${projectId}`);
  console.log(`Diagnostic Mode: ${isDiagnostic ? 'ON (Dry Run)' : 'OFF'}`);
  console.log(`==================================================\n`);

  const supabase = overrideSupabase || await createClient();
  
  // 1. Authenticate user & verify project ownership
  let userId = "service_role";
  if (!overrideSupabase) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      console.log(`[${TRACE_ID}] Auth FAIL: User not authenticated`);
      return { success: false, code: "UNAUTHORIZED", message: "User not authenticated" }
    }
    userId = user.id;
  }
  console.log(`[${TRACE_ID}] User: ${userId}`);

  const query = supabase
    .from("projects")
    .select("id, active_script_id, voice_preset_id, user_id")
    .eq("id", projectId);

  if (!overrideSupabase) {
    query.eq("user_id", userId);
  }

  const { data: project, error: projErr } = await query.single()

  if (projErr || !project) {
    console.log(`[${TRACE_ID}] Project Auth FAIL`);
    return { success: false, code: "NOT_FOUND", message: "Project not found or unauthorized" }
  }

  if (!project.active_script_id) {
    console.log(`[${TRACE_ID}] Project active_script_id is NULL`);
    return { success: false, code: "NO_ACTIVE_SCRIPT", message: "Project has no active script" }
  }
  console.log(`[${TRACE_ID}] Active Script: ${project.active_script_id}`);

  // Resolve Voice ID
  let resolvedVoiceId: string | undefined = undefined;
  let resolvedSettings: any = {};
  let targetPresetId = voicePresetId || project.voice_preset_id;
  
  if (!targetPresetId) {
    console.log(`[${TRACE_ID}] Target Preset is NULL`);
    return { success: false, code: "NO_VOICE_SELECTED", message: "No voice template assigned to this project." }
  }

  if (project.voice_preset_id && project.voice_preset_id !== targetPresetId) {
    console.log(`[${TRACE_ID}] Preset Mismatch`);
    throw new Error(`Target preset ID (${targetPresetId}) does not match project voice preset ID (${project.voice_preset_id})`);
  }

  const { data: vPreset } = await supabase
    .from("voice_presets")
    .select("display_name, voice_id, model_id, settings_json, provider")
    .eq("id", targetPresetId)
    .single();
    
  if (!vPreset) {
    console.log(`[${TRACE_ID}] Preset Not Found`);
    throw new Error(`Voice preset not found for id: ${targetPresetId}`);
  }
  
  (global as any).__DEBUG_PRESET_NAME = vPreset.display_name;
  resolvedVoiceId = vPreset.voice_id;
  resolvedSettings = vPreset.settings_json || {};
  
  let resolvedModelId = vPreset.model_id;
  if (!resolvedModelId) {
    const { data: creds } = await supabase
      .from("provider_credentials")
      .select("config_json")
      .eq("provider_id", vPreset.provider || "elevenlabs")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1);
    
    if (creds && creds.length > 0) {
      resolvedModelId = creds[0].config_json?.default_model_id;
    }
  }
  
  if (resolvedModelId) {
    resolvedSettings.model_id = resolvedModelId;
  }

  if (!resolvedVoiceId) {
    console.log(`[${TRACE_ID}] resolvedVoiceId is NULL`);
    throw new Error("Failed to resolve ElevenLabs Voice ID before generation.");
  }
  console.log(`[${TRACE_ID}] Voice Preset: ${vPreset.display_name}`);
  console.log(`[${TRACE_ID}] Provider: ${vPreset.provider || "elevenlabs"}`);
  console.log(`[${TRACE_ID}] Model: ${resolvedSettings.model_id}`);

  // Fetch Wallet Balance
  const adminClient = createAdminClient();
  const { data: wallet } = await adminClient.from("wallets").select("credits").eq("user_id", userId).single();
  console.log(`[${TRACE_ID}] Wallet Balance: ${wallet?.credits ?? 'UNKNOWN'}`);

  // 2. Fetch active script sections
  const { data: sections, error: sectionsErr } = await supabase
    .from("script_sections")
    .select("id, narration, voice_media_id, section_index")
    .eq("script_id", project.active_script_id)
    .order("section_index", { ascending: true })

  if (sectionsErr || !sections) {
    console.log(`[${TRACE_ID}] Fetch Sections FAIL`);
    const rawDetails = sectionsErr ? ` [${sectionsErr.code}] ${sectionsErr.message} ${sectionsErr.hint || ''}` : " [null]";
    return {
      success: false,
      code: "DB_ERROR",
      message: `Failed to fetch sections: ${rawDetails}`,
      rawError: sectionsErr
    }
  }
  console.log(`[${TRACE_ID}] Sections Count: ${sections.length}`);
  
  if (sections.length === 0) {
    console.log(`[${TRACE_ID}] No sections to process`);
    return { success: true, generatedCount: 0, skippedCount: 0, failedSections: [] };
  }

  let generatedCount = 0;
  let skippedCount = 0;
  const failedSections: Array<{ sectionId: string, sectionIndex: number, error: string }> = [];

  const ttsRuntime = new ProviderRuntime("elevenlabs", { retryCount: 2, retryDelay: 1000 });

  // 3. Process sections sequentially
  for (const section of sections) {
    console.log(`\n========================`);
    console.log(`SECTION ${section.section_index}`);
    console.log(`ID: ${section.id}`);
    console.log(`Narration Length: ${section.narration?.length || 0}`);
    console.log(`Voice Preset: ${vPreset.display_name}`);
    console.log(`voice_media_id(before): ${section.voice_media_id}`);
    console.log(`========================`);

    if (section.voice_media_id && !forceRegenerate) {
      console.log(`[${TRACE_ID}] Skipped (Already Generated)`);
      skippedCount++;
      continue;
    }

    if (!isDiagnostic) {
      const { data: lockData, error: lockErr } = await supabase
        .from('script_sections')
        .update({ voice_generation_status: 'generating' })
        .eq('id', section.id)
        .neq('voice_generation_status', 'generating')
        .select('id')
        .single();

      if (lockErr || !lockData) {
        console.log(`[${TRACE_ID}] GENERATION_LOCKED id=${section.id}`);
        failedSections.push({ sectionId: section.id, sectionIndex: section.section_index, error: "Generation already running for this section" });
        continue;
      }
    }

    let currentStep = "A. Init";
    try {
      const textHash = crypto.createHash('sha256').update(section.narration || "").digest('hex');
      const textLength = section.narration?.length || 0;
      const textPreview = section.narration ? section.narration.substring(0, 100) + (textLength > 100 ? "..." : "") : "";

      const generationSnapshot = {
        snapshot_time: new Date().toISOString(),
        engine: "ElevenLabsAdapter",
        provider: "elevenlabs",
        endpoint: `POST /v1/text-to-speech/${resolvedVoiceId}`,
        voice_id: resolvedVoiceId,
        model_id: resolvedSettings.model_id || "fallback",
        language_code: "vi",
        voice_settings: resolvedSettings,
        text_length: textLength,
        text_sha256: textHash,
        preview: textPreview,
        generation_time_ms: 0
      };

      if (!isDiagnostic) {
        await supabase.from("script_sections").update({ voice_generation_status: 'processing' }).eq("id", section.id);
      }
      
      const startTimeMs = Date.now();
      
      currentStep = "B. Billing";
      console.log(`\n${currentStep}`);
      
      const { BillingEngine, BillingFeature } = await import("@/utils/billing");
      
      let arrayBuffer;
      
      if (isDiagnostic) {
        console.log(`PASS (Diagnostic Mode)`);
        
        currentStep = "C. Resolve Provider";
        console.log(`\n${currentStep}\nPASS`);
        console.log(`Provider: elevenlabs`);
        console.log(`Model: ${resolvedSettings.model_id}`);
        
        currentStep = "D. Build Request";
        console.log(`\n${currentStep}\nPASS`);
        console.log(`Characters: ${textLength}`);
        console.log(`Voice: ${resolvedVoiceId}`);
        console.log(`Language: vi`);
        
        currentStep = "E. Call Provider";
        console.log(`\n${currentStep}`);
        const providerStart = Date.now();
        
        try {
          const aiResult = await ttsRuntime.execute(new ElevenLabsAdapter(), {
            step: "VOICE",
            projectId: projectId,
            args: { 
              text: section.narration, 
              voiceId: resolvedVoiceId,
              modelId: resolvedSettings.model_id,
              stability: resolvedSettings.stability,
              similarityBoost: resolvedSettings.similarity_boost,
              style: resolvedSettings.style,
              useSpeakerBoost: resolvedSettings.use_speaker_boost
            }
          });
          console.log(`PASS`);
          console.log(`Latency: ${Date.now() - providerStart}ms`);
          console.log(`Provider Response (Usage):`, JSON.stringify(aiResult.usage, null, 2));
          arrayBuffer = aiResult.result;
        } catch (diagErr: any) {
          console.log(`FAIL`);
          console.log(`Latency: ${Date.now() - providerStart}ms`);
          console.log(`Provider Response (Error):`, diagErr.message, diagErr.stack);
          throw diagErr;
        }
        
        console.log(`\n[DIAGNOSTIC MODE] Stopping before storage and DB insertion.`);
        continue; // Skip the rest in diagnostic mode
      }

      const walletBefore = await adminClient.from("wallets").select("credits").eq("user_id", userId).single();
      console.log(`Credit before: ${walletBefore.data?.credits}`);

      arrayBuffer = await BillingEngine.executeAndCharge(
        { userId: userId, projectId: projectId, feature: BillingFeature.VOICE_GENERATION },
        { provider: "elevenlabs", model: resolvedSettings.model_id },
        async (provider, model) => {
          
          currentStep = "C. Resolve Provider";
          console.log(`\n${currentStep}\nPASS`);
          console.log(`Provider: ${provider}`);
          console.log(`Model: ${model}`);

          currentStep = "D. Build Request";
          console.log(`\n${currentStep}\nPASS`);
          console.log(`Characters: ${textLength}`);
          console.log(`Voice: ${resolvedVoiceId}`);
          console.log(`Language: vi`);

          currentStep = "E. Call Provider";
          console.log(`\n${currentStep}`);
          const providerStart = Date.now();
          
          const aiResult = await ttsRuntime.execute(new ElevenLabsAdapter(), {
            step: "VOICE",
            projectId: projectId,
            args: { 
              text: section.narration, 
              voiceId: resolvedVoiceId,
              modelId: resolvedSettings.model_id,
              stability: resolvedSettings.stability,
              similarityBoost: resolvedSettings.similarity_boost,
              style: resolvedSettings.style,
              useSpeakerBoost: resolvedSettings.use_speaker_boost
            }
          });
          
          console.log(`PASS`);
          console.log(`Latency: ${Date.now() - providerStart}ms`);
          console.log(`Provider Response (Usage):`, JSON.stringify(aiResult.usage, null, 2));
          
          return { result: aiResult.result, usage: aiResult.usage, actualUsdCost: aiResult.cost };
        }
      );
      
      const walletAfter = await adminClient.from("wallets").select("credits").eq("user_id", userId).single();
      console.log(`Credit after: ${walletAfter.data?.credits}`);

      currentStep = "F. Audio Buffer";
      console.log(`\n${currentStep}`);
      const audioBuffer = Buffer.from(arrayBuffer);
      generationSnapshot.generation_time_ms = Date.now() - startTimeMs;

      if (!audioBuffer) {
        console.log(`FAIL`);
        throw new Error("Empty audio buffer returned");
      }
      console.log(`PASS`);
      console.log(`Bytes: ${audioBuffer.byteLength}`);

      let durationMs = 0;
      try {
        const metadata = await mm.parseBuffer(new Uint8Array(audioBuffer), 'audio/mpeg');
        if (metadata.format.duration) {
          durationMs = Math.round(metadata.format.duration * 1000);
        }
      } catch (err) {}

      const contentHash = crypto.createHash("sha256").update(audioBuffer).digest("hex");

      currentStep = "G. Upload Storage";
      console.log(`\n${currentStep}`);
      const fileName = `voice_${projectId}_${section.section_index}_${Date.now()}.mp3`;
      let asset;
      const uploadStart = Date.now();
      
      asset = await MediaService.upload(
        audioBuffer,
        fileName,
        "audio/mpeg",
        contentHash,
        userId,
        projectId,
        'AI'
      );
      console.log(`PASS`);
      console.log(`Bucket: ${asset.bucket}`);
      console.log(`Storage Key: ${asset.path}`);
      console.log(`URL: ${asset.public_url}`);
      console.log(`Upload Time: ${Date.now() - uploadStart}ms`);
      
      currentStep = "H. Insert project_media";
      console.log(`\n${currentStep}`);
      const { data: mediaInsert, error: mediaErr } = await supabase.from("project_media").insert({
        project_id: projectId,
        user_id: project.user_id,
        file_name: fileName,
        storage_key: asset.path,
        public_url: asset.public_url,
        mime_type: asset.mime_type,
        file_size: asset.size,
        asset_type: "voice",
        duration_ms: durationMs > 0 ? durationMs : null,
        section_id: section.id,
        generation_metadata: generationSnapshot
      }).select("id").single();

      if (mediaErr) {
        console.log(`FAILED\n[${mediaErr.code}] ${mediaErr.message} ${mediaErr.hint || ''}`);
        throw new Error(`SQL Insert Error: ${mediaErr.message}`);
      }
      console.log(`SUCCESS\nInserted ID: ${mediaInsert.id}`);

      await ReferenceManager.attach(asset.id, "project_media", mediaInsert.id);

      currentStep = "I. Update script_sections";
      console.log(`\n${currentStep}`);
      const { error: sectionUpdateErr } = await supabase.from("script_sections").update({
        voice_media_id: mediaInsert.id,
        voice_duration_ms: durationMs > 0 ? durationMs : null,
        voice_generation_status: 'completed'
      }).eq("id", section.id);

      if (sectionUpdateErr) {
        console.log(`FAILED\n[${sectionUpdateErr.code}] ${sectionUpdateErr.message} ${sectionUpdateErr.hint || ''}`);
        throw new Error(`SQL Update Error: ${sectionUpdateErr.message}`);
      }
      console.log(`PASS`);
      console.log(`voice_media_id: ${mediaInsert.id}`);
      console.log(`voice_duration_ms: ${durationMs}`);
      
      if (forceRegenerate && section.voice_media_id) {
        const { data: oldMedia } = await supabase.from("project_media").select("id, storage_key").eq("id", section.voice_media_id).single();
        if (oldMedia) {
          supabase.from("project_media").delete().eq("id", section.voice_media_id).then(async ({ error }) => {
            if (!error) {
               const { data: ref } = await adminClient.from("asset_references").select("asset_id").eq("entity_id", oldMedia.id).single();
               if (ref) {
                 await ReferenceManager.detach(ref.asset_id, "project_media", oldMedia.id);
               }
            }
          });
        }
      }

      generatedCount++;

    } catch (error: any) {
      console.log(`\n[${TRACE_ID}] FATAL ERROR`);
      console.log(`Section: ${section.section_index}`);
      console.log(`Current Step: ${currentStep}`);
      console.log(`Message: ${error.message}`);
      console.log(`Stack:\n${error.stack}`);
      
      failedSections.push({ sectionId: section.id, sectionIndex: section.section_index, error: `[${currentStep}] ${error.message}` });
      if (!isDiagnostic) {
        await supabase.from("script_sections").update({ voice_generation_status: 'failed' }).eq("id", section.id);
      }
    }
  }

  console.log(`\n========================`);
  console.log(`SUMMARY`);
  console.log(`TRACE_ID: ${TRACE_ID}`);
  console.log(`Sections: ${sections.length}`);
  console.log(`Success: ${generatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Failed: ${failedSections.length}`);
  console.log(`========================\n`);
  
  if (failedSections.length > 0) {
    for (const f of failedSections) {
      console.log(`FAILED SECTION ${f.sectionIndex}`);
      console.log(`STEP: ${f.error.split(']')[0].replace('[', '')}`);
      console.log(`Reason: ${f.error}\n`);
    }
  }

  if (!overrideSupabase && !isDiagnostic) {
    try {
      revalidatePath(`/projects/${projectId}`)
    } catch (e) {}
  }
  if (failedSections.length > 0) {
    return { success: false, code: "GENERATION_FAILED", message: `Generated ${generatedCount}, skipped ${skippedCount}, failed ${failedSections.length}. Check logs.` };
  }

  return { success: true, generatedCount, skippedCount, failedSections };
}

