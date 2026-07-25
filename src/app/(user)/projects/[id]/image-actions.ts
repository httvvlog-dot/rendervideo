"use server"

import { createClient } from "@/utils/supabase/server"
import { BillingEngine, BillingFeature, EngineContext } from "@/utils/billing"
import { ProviderRuntime } from "@/utils/provider-runtime"
import { AdapterRegistry } from "@/utils/provider-runtime/adapters/factory"

export async function generateAIImage(projectId: string, sectionId: string, prompt: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const context: EngineContext = {
    userId: user.id,
    projectId: projectId,
    feature: BillingFeature.IMAGE_GENERATION
  }

  try {
    const { BillingEngine, BillingFeature } = await import("@/utils/billing");
    
    // Pass empty requestedProviderModel to force BillingEngine to use default capability
    const result = await BillingEngine.executeAndCharge(
      context,
      {}, 
      async (provider, model) => {
        // IMAGE_PROVIDER_MODE check
        const mode = process.env.IMAGE_PROVIDER_MODE || "mock";
        
        if (mode === "mock") {
          await new Promise(resolve => setTimeout(resolve, 2000))
          let width = 1080;
          let height = 1920;
          
          const { data: project } = await supabase.from("projects").select("export_preset_id").eq("id", projectId).single()
          if (project?.export_preset_id) {
            const { data: preset } = await supabase.from("export_presets").select("width, height").eq("id", project.export_preset_id).single()
            if (preset) {
              width = preset.width || 1080;
              height = preset.height || 1920;
            }
          }

          const fakeUrl = `https://fakeimg.pl/${width}x${height}/282828/eae0d0/?text=Generated+Image+For+Prompt:+${encodeURIComponent(prompt).substring(0, 50)}`;
          
          return {
            result: {
              url: fakeUrl,
              width,
              height
            },
            usage: {
              provider,
              model,
              pricingType: "image",
              images: 1,
            },
            actualUsdCost: 0 // Mock cost
          }
        }
        
        // LIVE MODE
        const adapter = AdapterRegistry.get(provider);
        if (!adapter) throw new Error(`Adapter for provider ${provider} not found`);

        const runtime = new ProviderRuntime(provider, { retryCount: 2, retryDelay: 1000, failureThreshold: 3 });
        
        // Determine resolution
        let width = 1080;
        let height = 1920;
        const { data: project } = await supabase.from("projects").select("export_preset_id").eq("id", projectId).single()
        if (project?.export_preset_id) {
          const { data: preset } = await supabase.from("export_presets").select("width, height").eq("id", project.export_preset_id).single()
          if (preset) {
            width = preset.width || 1080;
            height = preset.height || 1920;
          }
        }

        const aiResult = await runtime.execute(adapter, {
          step: "IMAGE",
          projectId: projectId,
          args: { prompt, width, height }
        });
        
        return { result: aiResult.result, usage: aiResult.usage, actualUsdCost: aiResult.cost };
      }
    );

    // Save to storage_files...
    // But since the stub previously didn't save, we just return url
    // If the system requires saving, we can implement it here.
    return { success: true, ...(result as any) }
  } catch (error: any) {
    console.error("AI Image Generation Error:", error)
    return { error: error.message || "Failed to generate image" }
  }
}

export async function saveAIImage(projectId: string, sectionId: string, url: string, filename: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch image");
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";
    const extension = contentType.split("/")[1] || "png";
    const path = `${user.id}/${projectId}/${sectionId}/${Date.now()}_${filename.replace(/\s+/g, '_')}.${extension}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("project-media")
      .upload(path, buffer, { contentType });
      
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from("project-media").getPublicUrl(path);
    
    // Insert into project_media
    const { data: mediaData, error: dbError } = await supabase
      .from("project_media")
      .insert({
        project_id: projectId,
        section_id: sectionId,
        media_type: "image",
        file_path: path,
        public_url: publicUrl,
        size_bytes: buffer.byteLength,
        content_type: contentType
      })
      .select()
      .single();
      
    if (dbError) throw dbError;
    
    return { success: true, data: mediaData };
  } catch (error: any) {
    console.error("Save AI Image Error:", error);
    return { error: error.message || "Failed to save AI image" };
  }
}
