"use server"

import { createClient } from "@/utils/supabase/server"

import { UsageEngine, EngineContext } from "@/utils/billing"

export async function generateAIImageStub(projectId: string, sectionId: string, prompt: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const context: EngineContext = {
    userId: user.id,
    projectId: projectId,
    feature: 'Image'
  }

  try {
    const result = await UsageEngine.executeAndCharge(
      context,
      'openai', // Mock provider
      'gpt-image-1', // Mock model
      async () => {
        // Simulate AI Generation latency
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Fetch project to get export preset
        const { data: project } = await supabase
          .from("projects")
          .select("export_preset_id")
          .eq("id", projectId)
          .single()

        let width = 1080
        let height = 1920

        if (project?.export_preset_id) {
          const { data: preset } = await supabase
            .from("export_presets")
            .select("width, height")
            .eq("id", project.export_preset_id)
            .single()
            
          if (preset) {
            width = preset.width || 1080
            height = preset.height || 1920
          }
        }

        // Generate a placeholder from Unsplash based on aspect ratio
        const imageUrl = `https://images.unsplash.com/photo-1707343843437-caacff5cfa74?w=${width}&h=${height}&fit=crop&q=80`

        return {
          result: {
            url: imageUrl,
            width,
            height
          },
          usage: {
            provider: "openai",
            model: "gpt-image-1",
            pricingType: "image",
            images: 1,
            resolution: `${width}x${height}`
          }
        }
      }
    )

    return result
  } catch (error: any) {
    return { error: error.message || "Billing Error" }
  }
}

export async function saveAIImage(projectId: string, sectionId: string, imageUrl: string, prompt: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }
  
  // Here we would normally download the image and upload to Cloudflare R2.
  // For the stub, we just save the public URL to project_media.
  const fileName = `AI_Gen_${Date.now()}.jpg`
  
  // Determine sort order
  let sortOrder = 0;
  const { data: existingMedia } = await supabase
    .from("project_media")
    .select("section_sort_order")
    .eq("section_id", sectionId)
    .order("section_sort_order", { ascending: false })
    .limit(1)
  if (existingMedia && existingMedia.length > 0 && existingMedia[0].section_sort_order !== null) {
    sortOrder = existingMedia[0].section_sort_order + 1;
  }

  const { data, error } = await supabase.from("project_media").insert({
    project_id: projectId,
    user_id: user.id,
    file_name: fileName,
    storage_key: "ai_stub",
    public_url: imageUrl,
    mime_type: "image/jpeg",
    file_size: 0,
    section_id: sectionId,
    section_sort_order: sortOrder
  }).select().single()

  if (error) return { error: error.message }
  return { data }
}
