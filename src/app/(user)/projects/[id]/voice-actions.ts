"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { ProviderRuntime } from "@/utils/provider-runtime"
import { CloudflareR2Adapter } from "@/utils/provider-runtime/adapters/cloudflare-r2-adapter"
import { ElevenLabsAdapter } from "@/utils/provider-runtime/adapters/elevenlabs-adapter"
import * as mm from 'music-metadata'
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

export async function generateMissingProjectVoice(projectId: string, overrideSupabase?: SupabaseClient): Promise<GenerateVoiceResult> {
  console.log("[VOICE] START projectId=", projectId);
  const supabase = overrideSupabase || await createClient()
  
  // 1. Authenticate user & verify project ownership
  let userId = "service_role";
  if (!overrideSupabase) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { success: false, code: "UNAUTHORIZED", message: "User not authenticated" }
    userId = user.id;
  }

  const query = supabase
    .from("projects")
    .select("id, active_script_id, voice_template_id, user_id")
    .eq("id", projectId);

  if (!overrideSupabase) {
    query.eq("user_id", userId);
  }

  const { data: project, error: projErr } = await query.single()

  if (projErr || !project) return { success: false, code: "NOT_FOUND", message: "Project not found or unauthorized" }
  console.log("[VOICE] PROJECT_VERIFIED projectId=", projectId);
  if (!project.active_script_id) return { success: false, code: "NO_ACTIVE_SCRIPT", message: "Project has no active script" }
  console.log("[VOICE] ACTIVE_SCRIPT_FOUND scriptId=", project.active_script_id);

  // Resolve Voice ID from project
  let resolvedVoiceId: string | undefined = undefined;
  if (project.voice_template_id) {
    const { data: vTemplate } = await supabase
      .from("voice_templates")
      .select("voice_id")
      .eq("id", project.voice_template_id)
      .single();
      
    if (vTemplate && vTemplate.voice_id) {
      resolvedVoiceId = vTemplate.voice_id;
      console.log(`[TTS] Voice source: project`);
      console.log(`[TTS] Effective voice ID: ${resolvedVoiceId}`);
    }
  }

  if (!resolvedVoiceId) {
    console.log(`[TTS] Voice source: provider_default`);
  }

  // 2. Fetch active script sections
  const { data: sections, error: sectionsErr } = await supabase
    .from("script_sections")
    .select("id, narration, voice_media_id, section_index")
    .eq("script_id", project.active_script_id)
    .order("section_index", { ascending: true })

  if (sectionsErr || !sections) {
    const rawDetails = sectionsErr ? ` [${sectionsErr.code}] ${sectionsErr.message} ${sectionsErr.hint || ''}` : " [null]";
    return {
      success: false,
      code: "DB_ERROR",
      message: `Failed to fetch sections: ${rawDetails}`,
      rawError: sectionsErr
    }
  }
  console.log(`[VOICE] SECTIONS_FETCHED count=${sections.length}`);

  let generatedCount = 0;
  let skippedCount = 0;
  const failedSections: Array<{ sectionId: string, sectionIndex: number, error: string }> = [];

  const ttsRuntime = new ProviderRuntime("elevenlabs", { retryCount: 2, retryDelay: 1000 });
  const storageRuntime = new ProviderRuntime("cloudflare_r2", { retryCount: 2, retryDelay: 500 });
  const adminClient = createAdminClient();

  // 3. Process sections sequentially
  for (const section of sections) {
    if (section.voice_media_id) {
      skippedCount++;
      continue;
    }

    console.log(`[VOICE] SECTION_START index=${section.section_index}`);
    try {
      // a. Generate TTS
      console.log(`[VOICE] TTS_REQUEST_START section_index=${section.section_index}`);
      const audioBuffer = await ttsRuntime.execute(new ElevenLabsAdapter(), {
        step: "VOICE",
        projectId: projectId,
        args: { text: section.narration, voiceId: resolvedVoiceId }
      });
      console.log(`[VOICE] TTS_REQUEST_SUCCESS bytes=${audioBuffer.byteLength}`);

      // b. Parse duration
      let durationMs = 0;
      try {

        const metadata = await mm.parseBuffer(new Uint8Array(audioBuffer), 'audio/mpeg');
        if (metadata.format.duration) {
          durationMs = Math.round(metadata.format.duration * 1000);
        }
      } catch (err) {
        console.warn("music-metadata failed to parse duration:", err);
      }
      console.log(`[VOICE] AUDIO_DURATION_PARSED durationMs=${durationMs}`);

      // c. Upload to R2
      console.log(`[VOICE] R2_UPLOAD_START section_index=${section.section_index}`);
      const fileName = `voice_${projectId}_section_${section.section_index}_${Date.now()}.mp3`;
      const uploadResult = await storageRuntime.execute(new CloudflareR2Adapter(), {
        step: "UPLOAD",
        projectId: projectId,
        args: {
          action: "UPLOAD",
          fileBuffer: Buffer.from(audioBuffer),
          fileName,
          mimeType: "audio/mpeg",
          projectId: projectId
        }
      });
      console.log("[VOICE] R2_UPLOAD_SUCCESS publicUrl=", uploadResult.publicUrl);

      // d. Save to storage_files (Global Asset Rule)
      const { data: storageFile, error: storageErr } = await adminClient.from("storage_files").insert({
        provider: "cloudflare_r2",
        bucket: uploadResult.bucket,
        path: uploadResult.objectKey,
        mime_type: "audio/mpeg",
        size: audioBuffer.byteLength,
        public_url: uploadResult.publicUrl
      }).select("id").single();

      if (storageErr) {
        // Rollback R2
        let orphanedStorageRisk = false;
        try {
          await storageRuntime.execute(new CloudflareR2Adapter(), {
            step: "UPLOAD", projectId, args: { action: "DELETE", objectKey: uploadResult.objectKey }
          });
        } catch (e) {
          orphanedStorageRisk = true;
        }
        failedSections.push({ sectionId: section.id, sectionIndex: section.section_index, error: "storage_files insert failed" });
        continue;
      }

      // e. Insert project_media
      const { data: mediaInsert, error: mediaErr } = await supabase.from("project_media").insert({
        project_id: projectId,
        user_id: project.user_id,
        file_name: fileName,
        storage_key: uploadResult.objectKey,
        public_url: uploadResult.publicUrl,
        mime_type: "audio/mpeg",
        file_size: audioBuffer.byteLength,
        asset_type: "voice",
        duration_ms: durationMs > 0 ? durationMs : null,
        section_id: section.id,
      }).select("id").single();

      if (mediaErr) {
        // This is a complex rollback since we have a storage_files record.
        // We will attempt rollback, but the system prioritizes not losing data.
        failedSections.push({ sectionId: section.id, sectionIndex: section.section_index, error: "project_media insert failed" });
        continue;
      }
      console.log("[VOICE] PROJECT_MEDIA_INSERT_SUCCESS media_id=", mediaInsert.id);

      // f. Update script_sections
      const { error: sectionUpdateErr } = await supabase.from("script_sections").update({
        voice_media_id: mediaInsert.id,
        voice_duration_ms: durationMs > 0 ? durationMs : null
      }).eq("id", section.id);

      if (sectionUpdateErr) {
        failedSections.push({ sectionId: section.id, sectionIndex: section.section_index, error: "script_sections update failed" });
        continue;
      }
      console.log("[VOICE] SECTION_UPDATE_SUCCESS section_id=", section.id);

      generatedCount++;

    } catch (error: any) {
      console.log(`[VOICE] SECTION_FAILED index=${section.section_index} code=${error.code || 'UNKNOWN'} message=${error.message}`);
      failedSections.push({ sectionId: section.id, sectionIndex: section.section_index, error: error.message });
    }
  }

  console.log(`[VOICE] COMPLETE generated=${generatedCount} skipped=${skippedCount} failed=${failedSections.length}`);
  if (!overrideSupabase) {
    try {
      revalidatePath(`/projects/${projectId}`)
    } catch (e) {}
  }
  return { success: true, generatedCount, skippedCount, failedSections };
}
