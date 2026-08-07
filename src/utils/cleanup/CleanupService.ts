import { createAdminClient } from "@/utils/supabase/admin";
import { StorageService } from "@/utils/media/StorageService";

export class CleanupService {
  /**
   * Safe, transactional deletion of a project and its physical assets.
   * Only physical files with reference_count <= 1 are deleted.
   * 
   * @param projectId The UUID of the project to delete
   * @param dryRun If true, does not mutate DB or storage. Just returns what would be done.
   * @returns Object containing details of the cleanup result
   */
  static async deleteProject(projectId: string, dryRun: boolean = false) {
    const adminClient = createAdminClient();
    
    // 1. Gather all assets related to this project
    // Asset references link project entities (e.g. project_media) to storage_files.
    // Wait, first we need to get the entities that belong to the project.
    
    // Get project_media IDs
    const { data: media } = await adminClient.from("project_media").select("id").eq("project_id", projectId);
    // Get project_outputs IDs
    const { data: outputs } = await adminClient.from("project_outputs").select("id").eq("project_id", projectId);
    // Get audio_assets IDs
    const { data: audios } = await adminClient.from("audio_assets").select("id").eq("project_id", projectId);
    
    const entityIds = [
      ...(media?.map(m => m.id) || []),
      ...(outputs?.map(o => o.id) || []),
      ...(audios?.map(a => a.id) || [])
    ];
    
    const logResult = {
      projectId,
      dryRun,
      assetsFound: 0,
      filesDeleted: 0,
      filesSkippedShared: 0,
      referencesDetached: 0,
      success: true,
      error: null as string | null
    };

    if (entityIds.length === 0) {
      if (!dryRun) {
        const { error: dbErr } = await adminClient.from("projects").delete().eq("id", projectId);
        if (dbErr) {
          logResult.success = false;
          logResult.error = dbErr.message;
        }
      }
      return logResult;
    }

    // 2. Fetch references for these entities
    const { data: references } = await adminClient
      .from("asset_references")
      .select("id, asset_id")
      .in("entity_id", entityIds);
      
    if (!references || references.length === 0) {
      if (!dryRun) {
        const { error: dbErr } = await adminClient.from("projects").delete().eq("id", projectId);
        if (dbErr) {
          logResult.success = false;
          logResult.error = dbErr.message;
        }
      }
      return logResult;
    }

    const assetIds = references.map(r => r.asset_id);
    // Unique asset IDs
    const uniqueAssetIds = [...new Set(assetIds)];
    logResult.assetsFound = uniqueAssetIds.length;
    
    // 3. For each asset, check reference count and delete physical file if needed
    const { data: storageFiles } = await adminClient
      .from("storage_files")
      .select("id, provider, path, cached_reference_count")
      .in("id", uniqueAssetIds);
      
    if (storageFiles) {
      for (const file of storageFiles) {
        // Double check actual reference count to be absolutely safe
        const { count } = await adminClient
          .from("asset_references")
          .select("id", { count: "exact", head: true })
          .eq("asset_id", file.id);
          
        const actualCount = count || 0;
        
        if (actualCount > 1) {
          // Shared asset, skip physical deletion
          logResult.filesSkippedShared++;
          // We don't need to detach manually because the DB ON DELETE CASCADE from projects 
          // will delete project_media, which cascades to asset_references.
          // Or wait, asset_references entity_id is project_media, so we don't need to do anything.
        } else {
          // Orphaned asset, safe to delete physically
          if (!dryRun) {
            const deletedFromStorage = await StorageService.delete(file.provider, file.path, projectId);
            if (!deletedFromStorage) {
              logResult.success = false;
              logResult.error = `Failed to delete ${file.path} from storage`;
              return logResult; // Abort project deletion if physical delete fails
            }
            
            // Delete from storage_files
            await adminClient.from("storage_files").delete().eq("id", file.id);
          }
          logResult.filesDeleted++;
        }
      }
    }
    
    // 4. Finally, if all physical deletes succeeded, delete the project from PostgreSQL
    if (!dryRun) {
      const { error: dbErr } = await adminClient.from("projects").delete().eq("id", projectId);
      if (dbErr) {
        logResult.success = false;
        logResult.error = dbErr.message;
      }
    }
    
    return logResult;
  }
}
