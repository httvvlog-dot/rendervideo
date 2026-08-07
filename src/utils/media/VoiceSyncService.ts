import { createAdminClient } from "@/utils/supabase/admin";
import { Logger } from "@/utils/logger";
import { MediaRepository } from "./MediaRepository";

export class VoiceSyncService {
  /**
   * Synchronizes voice durations from project_media back to script_sections.
   * Performs consistency checks to ensure media exists and is of the correct type.
   */
  static async sync(projectId: string): Promise<{ success: boolean; message?: string }> {
    const correlationId = `sync_${projectId}_${Date.now()}`;
    Logger.info(`Starting VoiceSyncService.sync`, correlationId, { projectId });

    const adminClient = createAdminClient();

    // 1. Get active script
    const { data: project } = await adminClient
      .from("projects")
      .select("id, active_script_id")
      .eq("id", projectId)
      .single();

    if (!project || !project.active_script_id) {
      Logger.warn("Project or active script not found", correlationId, { projectId });
      return { success: false, message: "Project or active script not found." };
    }

    // 2. Fetch script_sections to find what needs syncing
    const { data: sections, error: sectionsErr } = await adminClient
      .from("script_sections")
      .select("id, section_index, voice_media_id")
      .eq("script_id", project.active_script_id)
      .order("section_index", { ascending: true });

    if (sectionsErr || !sections || sections.length === 0) {
      Logger.warn("No sections found for active script", correlationId, { scriptId: project.active_script_id });
      return { success: false, message: "No sections found to sync." };
    }

    // 3. Extract media IDs to lookup
    const voiceMediaIds = sections
      .map(s => s.voice_media_id)
      .filter((id): id is string => id !== null);

    if (voiceMediaIds.length === 0) {
      Logger.warn("No sections have voice_media_id assigned", correlationId, { sectionsCount: sections.length });
      return { success: false, message: "No voice media assigned to sections yet." };
    }

    // 4. Lookup Media via Repository
    let mediaRecords;
    try {
      mediaRecords = await MediaRepository.getMediaByIds(voiceMediaIds);
    } catch (err: any) {
      Logger.error("Failed to lookup media via repository", correlationId, err);
      return { success: false, message: "Internal error looking up media." };
    }

    const mediaMap = new Map(mediaRecords.map(m => [m.id, m]));
    const updatesToApply: any[] = [];
    let successCount = 0;
    let failCount = 0;

    // 5. Validation and Cross-check
    for (const section of sections) {
      if (!section.voice_media_id) {
        continue;
      }

      const media = mediaMap.get(section.voice_media_id);
      
      if (!media) {
        Logger.warn(`Section ${section.section_index}: voice_media_id exists but project_media not found`, correlationId, { 
          sectionId: section.id, 
          voiceMediaId: section.voice_media_id 
        });
        failCount++;
        continue;
      }

      if (media.asset_type !== 'voice') {
        Logger.warn(`Section ${section.section_index}: Invalid asset_type`, correlationId, { 
          sectionId: section.id, 
          assetType: media.asset_type 
        });
        failCount++;
        continue;
      }

      if (!media.duration_ms || media.duration_ms <= 0) {
        Logger.warn(`Section ${section.section_index}: Voice duration invalid`, correlationId, { 
          sectionId: section.id, 
          durationMs: media.duration_ms 
        });
        failCount++;
        continue;
      }

      // Validated
      Logger.info(`Section ${section.section_index}: Sync validated`, correlationId, { 
        sectionId: section.id,
        voiceMediaId: section.voice_media_id,
        duration: `${media.duration_ms}ms`,
        status: "SUCCESS"
      });
      
      updatesToApply.push({
        id: section.id,
        script_id: project.active_script_id, // Required for upsert if part of composite key, or just for safety
        voice_duration_ms: media.duration_ms
      });
      successCount++;
    }

    // 6. Batch Update
    if (updatesToApply.length > 0) {
      const startTime = Date.now();
      const { error: upsertErr } = await adminClient
        .from("script_sections")
        .upsert(updatesToApply, { onConflict: "id" });

      if (upsertErr) {
        Logger.error("Batch update failed", correlationId, upsertErr);
        return { success: false, message: "Failed to apply batched updates to sections." };
      }

      Logger.info(`Batch update applied`, correlationId, { 
        updatedRows: updatesToApply.length,
        elapsedMs: Date.now() - startTime 
      });
    }

    // 7. Final Verification & Response
    if (failCount > 0) {
      Logger.warn(`Sync completed with warnings`, correlationId, { success: successCount, failed: failCount, total: successCount + failCount });
      return { 
        success: true, // true so it moves forward, but we can pass a warning
        message: `Synced ${successCount}/${successCount + failCount} sections. Some had warnings, check logs.`
      };
    }

    Logger.info(`Sync completed successfully`, correlationId, { success: successCount, total: successCount + failCount });
    return { success: true };
  }
}
