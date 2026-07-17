"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"
import { ProviderRuntime, CloudflareR2Adapter } from "@/utils/provider-runtime"

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
    const uploadResult = await runtime.execute(new CloudflareR2Adapter(), {
      step: "UPLOAD",
      projectId: projectId,
      args: {
        action: "UPLOAD",
        fileBuffer: buffer,
        fileName: fileName,
        mimeType: file.type,
        projectId: projectId
      }
    });

    // 5. Save to database (storage_files for global asset rule)
    const adminClient = createAdminClient();
    const { data: storageFile, error: storageErr } = await adminClient.from("storage_files").insert({
      provider: "cloudflare_r2",
      bucket: uploadResult.bucket,
      path: uploadResult.objectKey,
      mime_type: file.type,
      size: file.size,
      public_url: uploadResult.publicUrl
    }).select("id").single()

    if (storageErr) {
      // Rollback R2 upload
      try {
        await runtime.execute(new CloudflareR2Adapter(), {
          step: "UPLOAD", projectId: projectId, args: { action: "DELETE", objectKey: uploadResult.objectKey }
        });
      } catch (e) {
        console.error("Failed to rollback R2 upload:", e);
      }
      return { error: "Failed to record file in storage_files: " + storageErr.message, uploadSucceeded: true, rollbackAttempted: true, databasePersisted: false }
    }

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
    const { error: dbErr } = await supabase.from("project_media").insert({
      project_id: projectId,
      user_id: user.id,
      file_name: file.name,
      storage_key: uploadResult.objectKey,
      public_url: uploadResult.publicUrl,
      mime_type: file.type,
      file_size: file.size,
      asset_type: "image",
      section_id: sectionId || null,
      section_sort_order: sectionId ? sortOrder : null
    })

    if (dbErr) {
      // Rollback storage_files
      await adminClient.from("storage_files").delete().eq("id", storageFile.id);
      // Rollback R2 upload
      try {
        await runtime.execute(new CloudflareR2Adapter(), {
          step: "UPLOAD", projectId: projectId, args: { action: "DELETE", objectKey: uploadResult.objectKey }
        });
      } catch (e) {
        console.error("Failed to rollback R2 upload:", e);
      }
      return { error: "Failed to record file in project_media: " + dbErr.message, uploadSucceeded: true, rollbackAttempted: true, databasePersisted: false }
    }

    revalidatePath(`/projects/${projectId}`)
    return { success: true, url: uploadResult.publicUrl }

  } catch (error: any) {
    return { error: `Upload failed after exhausting all buckets: ${error.message}` }
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

  // 5. Count other project_media references
  const { count: otherReferenceCount, error: countErr } = await supabase
    .from("project_media")
    .select("*", { count: "exact", head: true })
    .eq("storage_key", storageKey)
    .neq("id", mediaId)

  if (countErr) return { error: "Failed to check media references" }

  // 6. Delete dependent project_scenes
  const { error: sceneDeleteErr } = await supabase
    .from("project_scenes")
    .delete()
    .eq("media_id", mediaId)
    
  // 7. Verify scene deletion succeeded
  if (sceneDeleteErr) return { error: "Failed to delete dependent project scenes" }

  // 8. Delete target project_media row
  const { error: mediaDeleteErr } = await supabase
    .from("project_media")
    .delete()
    .eq("id", mediaId)

  if (mediaDeleteErr) return { error: "Failed to delete project_media row" }

  // Revalidate path here since the db part is done
  revalidatePath(`/projects/${projectId}`)

  // 9. Physical Deletion
  if (otherReferenceCount === 0) {
    try {
      const runtime = new ProviderRuntime("cloudflare_r2", {
        retryCount: 1,
        retryDelay: 500,
        failureThreshold: 2
      });

      // Attempt physical R2 object deletion
      await runtime.execute(new CloudflareR2Adapter(), {
        step: "UPLOAD", // We use UPLOAD step type generically, but pass action: DELETE
        projectId: projectId,
        args: {
          action: "DELETE",
          objectKey: storageKey
        }
      });
      
      // 10. We DO NOT delete storage_files metadata unless exact row identity is proven.
      // Since it cannot be proven, we leave it temporarily orphaned.
      return { 
        success: true, 
        mediaDeleted: true,
        physicalObjectDeleted: true,
        orphanedStorageRisk: true // Metadata remains
      };

    } catch (r2Err: any) {
      // R2 deletion fails
      console.error("R2 Physical Deletion Error:", r2Err);
      return { 
        success: true, // Partial success
        mediaDeleted: true, 
        physicalObjectDeleted: false, 
        orphanedStorageRisk: true 
      };
    }
  } else {
    // otherReferenceCount > 0
    return {
      success: true,
      mediaDeleted: true,
      physicalObjectDeleted: false,
      sharedObjectPreserved: true
    };
  }
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
