import { createAdminClient } from "@/utils/supabase/admin";

export class ProjectService {
  /**
   * Resolves the owning user_id for a given project_id.
   * This centralizes project queries and enforces responsibility boundaries.
   */
  static async resolveOwner(projectId: string): Promise<string | null> {
    const adminClient = createAdminClient();
    const { data: project, error } = await adminClient
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      console.error(`[ProjectService] Failed to resolve owner for project ${projectId}:`, error);
      return null;
    }
    return project.user_id;
  }
}
