import { createAdminClient } from "@/utils/supabase/admin";
import { Logger } from "@/utils/logger";

export interface ProjectMedia {
  id: string;
  project_id: string;
  asset_type: string;
  file_name: string;
  public_url: string;
  duration_ms: number | null;
  section_id: string | null;
}

export class MediaRepository {
  /**
   * Fetches media records by a list of IDs.
   * Useful for batch lookups during timeline syncing or rendering.
   */
  static async getMediaByIds(mediaIds: string[]): Promise<ProjectMedia[]> {
    if (!mediaIds || mediaIds.length === 0) return [];
    
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("project_media")
      .select("id, project_id, asset_type, file_name, public_url, duration_ms, section_id")
      .in("id", mediaIds);
      
    if (error) {
      Logger.error("MediaRepository.getMediaByIds failed", "SYSTEM", error);
      throw new Error(`Failed to fetch media by IDs: ${error.message}`);
    }
    
    return data || [];
  }

  /**
   * Fetches all media for a specific project.
   */
  static async getProjectMedia(projectId: string): Promise<ProjectMedia[]> {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("project_media")
      .select("id, project_id, asset_type, file_name, public_url, duration_ms, section_id")
      .eq("project_id", projectId);
      
    if (error) {
      Logger.error("MediaRepository.getProjectMedia failed", "SYSTEM", error);
      throw new Error(`Failed to fetch project media: ${error.message}`);
    }
    
    return data || [];
  }
}
