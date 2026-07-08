"use server"

import { createClient } from "@/utils/supabase/server"
import { uploadToS3 } from "@/utils/s3-signer"
import { revalidatePath } from "next/cache"

export async function uploadProjectMedia(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // 1. Validate project ownership
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) return { error: "Project not found or access denied" }

  // 2. Extract file
  const file = formData.get("file") as File
  if (!file) return { error: "No file provided" }
  
  if (file.size > 20 * 1024 * 1024) return { error: "File size exceeds 20MB limit" }
  if (!file.type.startsWith("image/")) return { error: "Only images are allowed" }

  // 3. Get R2 Provider Config
  const { data: provider } = await supabase
    .from("providers")
    .select("config_json")
    .eq("provider_type", "storage")
    .eq("is_active", true)
    .single()

  if (!provider || !provider.config_json) return { error: "Cloudflare R2 provider not configured" }
  const config = provider.config_json
  
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
    return { error: "Incomplete R2 configuration" }
  }

  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`
  const extension = file.name.split('.').pop() || "png"
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`
  const storageKey = `projects/${projectId}/media/${fileName}`
  
  // 4. Upload to R2 using Native AWS SigV4
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  const uploadRes = await uploadToS3(
    {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      endpoint
    },
    config.bucket,
    storageKey,
    buffer,
    file.type
  )
  
  if (!uploadRes.success) {
    return { error: uploadRes.error }
  }

  // 5. Construct Public URL
  let publicUrl = ""
  if (config.publicUrl) {
    const base = config.publicUrl.endsWith("/") ? config.publicUrl.slice(0, -1) : config.publicUrl
    publicUrl = `${base}/${storageKey}`
  } else {
    // Fallback if no public URL configured (won't be accessible in browser without it, but we store it anyway)
    publicUrl = `${endpoint}/${config.bucket}/${storageKey}`
  }

  // 6. Save metadata to project_media
  const { error: dbError } = await supabase.from("project_media").insert({
    project_id: projectId,
    user_id: user.id,
    file_name: file.name,
    storage_key: storageKey,
    public_url: publicUrl,
    mime_type: file.type,
    file_size: file.size
  })

  if (dbError) {
    return { error: dbError.message }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteProjectMedia(mediaId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Verify ownership
  const { data: media } = await supabase
    .from("project_media")
    .select("*")
    .eq("id", mediaId)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single()

  if (!media) return { error: "Media not found" }

  // Delete from database
  const { error } = await supabase.from("project_media").delete().eq("id", mediaId)
  if (error) return { error: error.message }

  // Note: For full cleanup, we should also delete from Cloudflare R2 here
  // using an S3 DELETE request. For simplicity in this foundation, we just delete the DB record.
  
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
