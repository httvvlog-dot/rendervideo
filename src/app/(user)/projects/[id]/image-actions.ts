"use server"

import { createClient } from "@/utils/supabase/server"
import { BillingEngine, BillingFeature, EngineContext } from "@/utils/billing"
import { ProviderRuntime } from "@/utils/provider-runtime"
import { AdapterRegistry } from "@/utils/provider-runtime/adapters/factory"

import { PromptValidator } from "@/utils/prompt-validator"
import { ImageProviderAdapter } from "@/utils/provider-runtime/adapters/image-adapters"

export async function generateAIImage(projectId: string, sectionId: string) {
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
    
    // First, let's create a pending image_job
    const { data: job, error: jobError } = await supabase.from("image_jobs").insert({
      user_id: user.id,
      project_id: projectId,
      section_id: sectionId,
      mode: 'TEXT_TO_IMAGE',
      status: 'PENDING',
      input_source: 'SCRIPT'
    }).select().single();

    if (jobError || !job) throw new Error("Failed to create image job tracking");

    // Pass empty requestedProviderModel to force BillingEngine to use default capability
    const result = await BillingEngine.executeAndCharge(
      context,
      {}, 
      async (provider, model) => {
        const adapter = AdapterRegistry.get(provider) as unknown as ImageProviderAdapter;
        if (!adapter || !adapter.generate) throw new Error(`Image Adapter for provider ${provider} not found`);

        // Retrieve prompt from database
        const runtime = new ProviderRuntime(provider, { retryCount: 2, retryDelay: 1000, failureThreshold: 3 });

        const { data: section } = await supabase.from("script_sections").select("image_prompt, visual_description").eq("id", sectionId).single();
        if (!section) throw new Error("Không tìm thấy phân cảnh.");
        
        const originalPrompt = section.image_prompt?.trim() || "";
        const visualDescription = section.visual_description?.trim() || "";
        
        if (!originalPrompt && !visualDescription) throw new Error(`Section ${sectionId} không có dữ liệu hình ảnh.`);

        let finalPrompt = originalPrompt;
        let validationStatus = "PASS";
        
        // 1. Prompt Validation Step
        if (originalPrompt && visualDescription) {
           const validator = new PromptValidator();
           const validationResult = await validator.validate(visualDescription, originalPrompt, projectId);
           
           if (validationResult.status === "FAILED" && validationResult.confidence < 0.5) {
             throw new Error(`AI Validator rejected the prompt (hallucination detected). Reason: ${validationResult.reason}`);
           } else if (validationResult.status === "CORRECTED") {
             finalPrompt = validationResult.validatedPrompt;
             validationStatus = "CORRECTED";
             // Auto-update the DB so UI sees the correction
             await supabase.from("script_sections").update({ image_prompt: finalPrompt }).eq("id", sectionId);
           }
        } else if (!originalPrompt && visualDescription) {
           finalPrompt = visualDescription; // fallback in worst case, though Prompt Engineer should have populated it
        }

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

        // Update Job state to PROCESSING
        await supabase.from("image_jobs").update({
          status: 'PROCESSING',
          original_prompt: originalPrompt,
          validated_prompt: finalPrompt,
          provider: provider, // fallback if provider_id not fetched yet
          model: model
        }).eq("id", job.id);

        const aiResult = await runtime.invoke(
          async (cred) => adapter.generate(cred, { prompt: finalPrompt, width, height, model }), 
          { step: "IMAGE", projectId }
        );
        
        // Finalize Job
        await supabase.from("image_jobs").update({
          status: 'COMPLETED',
          credential_id: aiResult.credentialId,
          output_image_url: aiResult.result.url,
          provider_request: (aiResult as any).provider_request || {}, // if adapter passed it
          provider_response: (aiResult as any).provider_response || {} 
        }).eq("id", job.id);

        return { result: aiResult.result, usage: aiResult.usage, actualUsdCost: aiResult.cost, url: aiResult.result.url };
      }
    );

    return { success: true, url: result.url }
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
        asset_type: "image",
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
