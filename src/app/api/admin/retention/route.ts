import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { RETENTION_CONFIG } from "@/config/system";

export const dynamic = "force-dynamic";

export async function GET() {
  const adminClient = createAdminClient();
  
  // Find projects expiring
  const expirationThreshold = new Date(Date.now() - RETENTION_CONFIG.RETENTION_HOURS * 60 * 60 * 1000).toISOString();
  
  const { data: projects } = await adminClient
    .from("projects")
    .select("id")
    .lte("created_at", expirationThreshold)
    .in("status", ["completed", "failed", "cancelled", "draft"]);
    
  let storageToFree = 0;
  
  if (projects && projects.length > 0) {
    // For simplicity in estimation, we just count all storage files directly linked by project_media etc
    // A proper complex query could be done, but for health dashboard this approximation is fine
    const projectIds = projects.map(p => p.id);
    const { data: media } = await adminClient.from("project_media").select("storage_key").in("project_id", projectIds);
    if (media && media.length > 0) {
      const keys = media.map(m => m.storage_key);
      const { data: files } = await adminClient.from("storage_files").select("size").in("path", keys);
      if (files) {
         storageToFree = files.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
      }
    }
  }

  return NextResponse.json({
    projectsExpiring: projects?.length || 0,
    storageToFreeBytes: storageToFree
  });
}