"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"
import { ProviderRuntime, CloudflareR2Adapter } from "@/utils/provider-runtime"
import { MediaService } from "@/utils/media/MediaService"
import { ReferenceManager } from "@/utils/media/ReferenceManager"
import * as crypto from "crypto";

export async function uploadProjectMedia(projectId: string, formData: FormData, sectionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) return { error: "Project not found or access denied" }

  // Validate section ownership if provided
  if (sectionId) {
    const { data: section } = await supabase.from("script_sections").select("project_id").eq("id", sectionId).single()
    if (!section || section.project_id !== projectId) {
      return { error: "Section not found or does not belong to this project" }
    }
  }

  const file = formData.get("file") as File
  if (!file) return { error: "No file provided" }
  
  if (file.size > 20 * 1024 * 1024) return { error: "File size exceeds 20MB limit" }
  if (!file.type.startsWith("image/")) return { error: "Only images are allowed" }

  const extension = file.name.split('.').pop() || "png"
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`
  
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  const runtime = new ProviderRuntime("cloudflare_r2", {
    retryCount: 2,
    retryDelay: 500,
    failureThreshold: 3
  });

  try {
    // Calculate hash
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
    
    // Upload via MediaService (Asset Manager)
    const asset = await MediaService.upload(
      buffer,
      fileName,
      file.type,
      contentHash,
      user.id,
      projectId,
      'UPLOAD' // Generation Type
    );

    // Calculate sort order if assigning to section
    let sortOrder = 0;
    if (sectionId) {
       const { data: existingMedia } = await supabase
         .from("project_media")
         .select("section_sort_order")
         .eq("section_id", sectionId)
         .order("section_sort_order", { ascending: false })
         .limit(1)
       if (existingMedia && existingMedia.length > 0 && existingMedia[0].section_sort_order !== null) {
         sortOrder = existingMedia[0].section_sort_order + 1;
       }
    }

    // Save to project_media (for UI timeline)
    const { data: mediaData, error: dbErr } = await supabase.from("project_media").insert({
      project_id: projectId,
      user_id: user.id,
      file_name: file.name,
      storage_key: asset.path,
      public_url: asset.public_url,
      mime_type: asset.mime_type,
      file_size: asset.size,
      asset_type: "image",
      section_id: sectionId || null,
      section_sort_order: sectionId ? sortOrder : null
    }).select("id").single();

    if (dbErr) {
      throw new Error("Failed to record file in project_media: " + dbErr.message);
    }
    
    // Attach to ReferenceManager
    await ReferenceManager.attach(asset.id, "project_media", mediaData.id);

    revalidatePath(`/projects/${projectId}`)
    return { success: true, url: asset.public_url }

  } catch (error: any) {
    return { error: `Upload failed: ${error.message}` }
  }
}

export async function deleteProjectMedia(fileId: string, projectId: string) {
  // 1. Authenticate user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // 2. Fetch target project_media
  const { data: targetMedia, error: mediaErr } = await supabase
    .from("project_media")
    .select("id, project_id, storage_key, public_url")
    .eq("id", fileId)
    .single()
    
  if (mediaErr || !targetMedia) return { error: "Media not found" }

  // 3. Verify project ownership securely
  if (targetMedia.project_id !== projectId) return { error: "Media does not belong to this project" }
  
  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()
    
  if (!project) return { error: "Unauthorized" }

  // 4. Save target metadata
  const mediaId = targetMedia.id
  const storageKey = targetMedia.storage_key
  const publicUrl = targetMedia.public_url

  // 5. Delete dependent project_scenes
  const { error: sceneDeleteErr } = await supabase
    .from("project_scenes")
    .delete()
    .eq("media_id", mediaId)
    
  if (sceneDeleteErr) return { error: "Failed to delete dependent project scenes" }

  // 6. Look up Asset ID before deleting project_media
  const adminClient = createAdminClient();
  const { data: refData } = await adminClient
    .from("asset_references")
    .select("asset_id")
    .eq("entity_type", "project_media")
    .eq("entity_id", mediaId)
    .single();

  // 7. Delete target project_media row
  const { error: mediaDeleteErr } = await supabase
    .from("project_media")
    .delete()
    .eq("id", mediaId)

  if (mediaDeleteErr) return { error: "Failed to delete project_media row" }

  // 8. Detach Reference (Garbage Collection is handled async by ReferenceManager)
  if (refData) {
    try {
      await ReferenceManager.detach(refData.asset_id, "project_media", mediaId);
    } catch (err) {
      console.error("Failed to detach reference:", err);
    }
  }

  revalidatePath(`/projects/${projectId}`)

  return { 
    success: true, 
    mediaDeleted: true,
    detached: !!refData
  };
}

export async function getSectionImages(sectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("project_media")
    .select("*")
    .eq("section_id", sectionId)
    .eq("asset_type", "image")
    .order("section_sort_order", { ascending: true })

  if (error) throw new Error("Failed to fetch section images")
  return data
}

export async function getSectionVoices(sectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("project_media")
    .select("*")
    .eq("section_id", sectionId)
    .eq("asset_type", "voice")
    .order("section_sort_order", { ascending: true })

  if (error) throw new Error("Failed to fetch section voices")
  return data
}

export async function assignMediaToSection(mediaId: string, sectionId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Verify project ownership
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) return { error: "Unauthorized or project not found" }

  // Verify section ownership
  const { data: section } = await supabase.from("script_sections").select("project_id").eq("id", sectionId).single()
  if (!section || section.project_id !== projectId) return { error: "Invalid section" }

  // Verify media ownership
  const { data: media } = await supabase.from("project_media").select("project_id, asset_type").eq("id", mediaId).single()
  if (!media || media.project_id !== projectId) return { error: "Invalid media" }

  // Get max sort order for this specific asset type
  const { data: existingMedia } = await supabase
    .from("project_media")
    .select("section_sort_order")
    .eq("section_id", sectionId)
    .eq("asset_type", media.asset_type)
    .order("section_sort_order", { ascending: false })
    .limit(1)
    
  let sortOrder = 0;
  if (existingMedia && existingMedia.length > 0 && existingMedia[0].section_sort_order !== null) {
    sortOrder = existingMedia[0].section_sort_order + 1;
  }

  const { error } = await supabase
    .from("project_media")
    .update({ section_id: sectionId, section_sort_order: sortOrder })
    .eq("id", mediaId)

  if (error) return { error: error.message }
  
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function unassignMediaFromSection(mediaId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Securely update only if project matches user
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) return { error: "Unauthorized" }

  const { error } = await supabase
    .from("project_media")
    .update({ section_id: null, section_sort_order: null })
    .eq("id", mediaId)
    .eq("project_id", projectId)

  if (error) return { error: error.message }
  
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function reorderSectionMedia(sectionId: string, orderedMediaIds: string[], projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase.rpc("reorder_section_media", {
    p_section_id: sectionId,
    p_ordered_media_ids: orderedMediaIds
  })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function getMissingImageSections(scriptId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // 1. Get all sections for this script
  const { data: sections, error: secErr } = await supabase
    .from("script_sections")
    .select("id, section_index")
    .eq("script_id", scriptId)
    .order("section_index", { ascending: true })

  if (secErr || !sections) throw new Error("Failed to fetch script sections")
  if (sections.length === 0) return []

  const sectionIds = sections.map(s => s.id)

  // 2. Get all image media for these sections
  const { data: media, error: medErr } = await supabase
    .from("project_media")
    .select("section_id")
    .in("section_id", sectionIds)
    .eq("asset_type", "image")

  if (medErr) throw new Error("Failed to fetch media mapping")

  // 3. Filter sections that have NO matching image
  const sectionsWithImages = new Set(media?.map(m => m.section_id) || [])
  const missingSections = sections.filter(s => !sectionsWithImages.has(s.id))

  return missingSections
}
