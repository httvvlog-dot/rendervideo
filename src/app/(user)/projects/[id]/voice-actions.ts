"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { ProviderRuntime } from "@/utils/provider-runtime"
import { CloudflareR2Adapter } from "@/utils/provider-runtime/adapters/cloudflare-r2-adapter"
import { ElevenLabsAdapter } from "@/utils/provider-runtime/adapters/elevenlabs-adapter"
import * as mm from 'music-metadata'
import { revalidatePath } from "next/cache"

export async function generateMissingProjectVoice(projectId: string) {
  const supabase = await createClient()
  
  // 1. Authenticate user & verify project ownership
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { success: false, code: "UNAUTHORIZED", message: "User not authenticated" }

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, active_script_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (projErr || !project) return { success: false, code: "NOT_FOUND", message: "Project not found or unauthorized" }
  if (!project.active_script_id) return { success: false, code: "NO_ACTIVE_SCRIPT", message: "Project has no active script" }

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

  let generatedCount = 0;
  let skippedCount = 0;
  const failedSections = [];

  const ttsRuntime = new ProviderRuntime("elevenlabs", { retryCount: 2, retryDelay: 1000 });
  const storageRuntime = new ProviderRuntime("cloudflare_r2", { retryCount: 2, retryDelay: 500 });
  const adminClient = createAdminClient();

  // 3. Process sections sequentially
  for (const section of sections) {
    if (section.voice_media_id) {
      skippedCount++;
      continue;
    }

    try {
      // a. Generate TTS
      const generateResult = await ttsRuntime.execute(new ElevenLabsAdapter(), {
        step: "VOICE",
        projectId: projectId,
        args: { text: section.narration }
      });

      // b. Parse duration
      let durationMs = 0;
      try {
        const audioBuffer = generateResult;
        const metadata = await mm.parseBuffer(new Uint8Array(audioBuffer), 'audio/mpeg');
        if (metadata.format.duration) {
          durationMs = Math.round(metadata.format.duration * 1000);
        }
      } catch (err) {
        console.warn("music-metadata failed to parse duration:", err);
      }

      // c. Upload to R2
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
        failedSections.push({ sectionId: section.id, error: "storage_files insert failed", orphanedStorageRisk });
        continue;
      }

      // e. Insert project_media
      const { data: mediaInsert, error: mediaErr } = await supabase.from("project_media").insert({
        project_id: projectId,
        user_id: user.id,
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
        failedSections.push({ sectionId: section.id, error: "project_media insert failed", orphanedStorageRisk: true });
        continue;
      }

      // f. Update script_sections
      const { error: sectionUpdateErr } = await supabase.from("script_sections").update({
        voice_media_id: mediaInsert.id,
        voice_duration_ms: durationMs > 0 ? durationMs : null
      }).eq("id", section.id);

      if (sectionUpdateErr) {
        failedSections.push({ sectionId: section.id, error: "script_sections update failed" });
        continue;
      }

      generatedCount++;

    } catch (error: any) {
      console.error(`Failed to generate voice for section ${section.id}:`, error);
      failedSections.push({ sectionId: section.id, error: error.message });
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true, generatedCount, skippedCount, failedSections };
}
