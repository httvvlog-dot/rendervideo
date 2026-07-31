"use server"

import { createClient } from "@/utils/supabase/server"
import { BillingEngine, BillingFeature, EngineContext } from "@/utils/billing"
import { ProviderRuntime } from "@/utils/provider-runtime"
import { AdapterRegistry } from "@/utils/provider-runtime/adapters/factory"
import { MediaService } from "@/utils/media/MediaService"
import { ReferenceManager } from "@/utils/media/ReferenceManager"
import * as crypto from "crypto";

import { PromptValidator } from "@/utils/prompt-validator"
import { ImageProviderAdapter } from "@/utils/provider-runtime/adapters/image-adapters"
import { generateCorrelationId, Logger } from "@/utils/logger"
import { AppError } from "@/utils/errors"
import { getProjectCanvas } from "@/lib/project-canvas"

export async function generateAIImage(projectId: string, sectionId: string) {
  const correlationId = generateCorrelationId('img');
  Logger.info(`Starting generateAIImage`, correlationId, { projectId, sectionId });
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
    
    // First, let's attempt to create a pending image_job
    let jobId: string | null = null;
    try {
      const { data: job, error: jobError } = await supabase.from("image_jobs").insert({
        user_id: user.id,
        project_id: projectId,
        section_id: sectionId,
        mode: 'TEXT_TO_IMAGE',
        status: 'PENDING',
        input_source: 'SCRIPT'
      }).select().single();

      if (jobError) {
        console.warn(`[WARNING] Failed to create image_job tracking: ${jobError.message}. Proceeding without tracking.`);
      } else if (job) {
        jobId = job.id;
      }
    } catch (e: any) {
      console.warn(`[WARNING] Exception creating image_job: ${e.message}. Proceeding without tracking.`);
    }

    // --- PRE-FLIGHT: Database Fetch & Validation ---
    const { data: section, error: sectionError } = await supabase.from("script_sections").select("id, image_prompt, visual_description, negative_prompt").eq("id", sectionId).single();
    
    if (sectionError) {
      console.error("[generateAIImage] Error fetching section:", sectionError);
      if (sectionError.code === "42703") {
        throw new AppError({
          code: "SCHEMA_OUTDATED",
          category: "DATABASE",
          severity: "CRITICAL",
          message: "Database schema validation failed: Column 'negative_prompt' does not exist in 'script_sections'. Please run the latest migration.",
          retryable: false,
          correlationId
        });
      }
      throw new AppError({
        code: "DATABASE_ERROR",
        category: "DATABASE",
        severity: "ERROR",
        message: `Failed to fetch section: ${sectionError.message}`,
        retryable: true,
        correlationId,
        originalError: sectionError
      });
    }

    if (!section) {
      throw new AppError({ code: "NOT_FOUND", category: "DATABASE", severity: "ERROR", message: "Section not found.", retryable: false, correlationId });
    }
    
    const originalPrompt = section.image_prompt?.trim() || "";
    const visualDescription = section.visual_description?.trim() || "";
    const negativePrompt = section.negative_prompt || undefined;
    
    if (!originalPrompt && !visualDescription) throw new AppError({ code: "INVALID_DATA", category: "VALIDATION", severity: "ERROR", message: `Section ${sectionId} không có dữ liệu hình ảnh.`, retryable: false, correlationId });

    let finalPrompt = originalPrompt;
    let validationStatus = "PASS";
    
    // 1. Prompt Validation Step
    if (originalPrompt && visualDescription) {
       const validator = new PromptValidator();
       const validationResult = await validator.validate(visualDescription, originalPrompt, projectId);
       
       if (validationResult.status === "FAILED" && validationResult.confidence < 0.5) {
         throw new AppError({ code: "PROMPT_REJECTED", category: "VALIDATION", severity: "WARNING", message: `AI Validator rejected the prompt (hallucination detected). Reason: ${validationResult.reason}`, retryable: false, correlationId });
       } else if (validationResult.status === "CORRECTED") {
         finalPrompt = validationResult.validatedPrompt;
         validationStatus = "CORRECTED";
         // Auto-update the DB so UI sees the correction
         await supabase.from("script_sections").update({ image_prompt: finalPrompt }).eq("id", sectionId);
       }
    } else if (!originalPrompt && visualDescription) {
       finalPrompt = visualDescription; // fallback in worst case
    }

    // Determine resolution
    const { data: project } = await supabase.from("projects").select("aspect_ratio, canvas_width, canvas_height").eq("id", projectId).single()
    const canvasConfig = getProjectCanvas(project || undefined);
    const width = canvasConfig.width;
    const height = canvasConfig.height;
    // --- END PRE-FLIGHT ---

    const result = await BillingEngine.executeAndCharge(
      context,
      { correlationId }, 
      async (provider, model) => {
        const adapter = AdapterRegistry.get(provider) as unknown as ImageProviderAdapter;
        if (!adapter || !adapter.generate) throw new Error(`Image Adapter for provider ${provider} not found`);

        const runtime = new ProviderRuntime(provider, { retryCount: 2, retryDelay: 1000, failureThreshold: 3 });



        // Update Job state to PROCESSING
        if (jobId) {
          try {
            await supabase.from("image_jobs").update({
              status: 'PROCESSING',
              original_prompt: originalPrompt,
              validated_prompt: finalPrompt,
              provider: provider,
              model: model
            }).eq("id", jobId);
          } catch (e) {
            console.warn("[WARNING] Failed to update image_job to PROCESSING");
          }
        }

        let attempt = 0;
        let aiResult: any;
        const maxRetries = 2;

        while (attempt <= maxRetries) {
          attempt++;
          aiResult = await runtime.invoke(
            async (cred) => adapter.generate(cred, { prompt: finalPrompt, negative_prompt: negativePrompt, width, height, model }), 
            { step: "IMAGE", projectId }
          );

          // Vision Validator (AI Checking AI)
          if (visualDescription && aiResult.result.url) {
            const { VisionValidator } = await import("@/utils/vision-validator");
            const visionValidator = new VisionValidator();
            const visionRes = await visionValidator.validate(visualDescription, finalPrompt, aiResult.result.url);

            if (visionRes.status === "REGENERATE" && attempt <= maxRetries) {
               console.log(`[VisionValidator] Rejecting image on attempt ${attempt}. Reason: ${visionRes.reason}. Retrying...`);
               continue; // Loop again
            } else if (visionRes.status === "REGENERATE") {
               console.warn(`[VisionValidator] Max retries reached. Forcing PASS despite: ${visionRes.reason}`);
            }
          }
          break; // Exit loop if PASS or max retries reached
        }
        
        // Finalize Job
        if (jobId) {
          try {
            await supabase.from("image_jobs").update({
              status: 'COMPLETED',
              credential_id: aiResult.credentialId,
              output_image_url: aiResult.result.url,
              provider_request: (aiResult as any).provider_request || {}, // if adapter passed it
              provider_response: (aiResult as any).provider_response || {} 
            }).eq("id", jobId);
            console.log(`[Trace] 10. Database Save (image_jobs): SUCCESS`);
          } catch (e) {
            console.warn("[WARNING] Failed to finalize image_job");
            console.log(`[Trace] 10. Database Save (image_jobs): FAILED`);
          }
        }

        return { result: aiResult.result, usage: aiResult.usage, actualUsdCost: aiResult.cost, url: aiResult.result.url, width: aiResult.result.width, height: aiResult.result.height };
      }
    );

    const finalState = { success: true, url: result.url, width: result.width, height: result.height };
    Logger.info(`React State Payload`, correlationId, finalState);
    console.log("=== RUNTIME TRACE END ===\n");
    return finalState;
  } catch (error: any) {
    Logger.error("AI Image Generation Error", correlationId, error);
    const errorMessage = error instanceof AppError ? error.message : (error.message || "Failed to generate image");
    const finalState = { error: errorMessage };
    console.log(`[Trace] 11. React State Payload (Error):`, JSON.stringify(finalState));
    console.log("=== RUNTIME TRACE END ===\n");
    return finalState;
  }
}

export async function saveAIImage(projectId: string, sectionId: string, url: string, filename: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch image");
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "image/png";
    
    // 1. Calculate Content Hash
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
    
    // 2. Upload via MediaService (Asset Manager)
    const asset = await MediaService.upload(
      buffer,
      filename,
      contentType,
      contentHash,
      user.id,
      projectId,
      'AI' // Generation Type
    );
    
    // 3. Business Attachment: Insert into project_media for UI Timeline
    const { data: mediaData, error: dbError } = await supabase
      .from("project_media")
      .insert({
        project_id: projectId,
        section_id: sectionId,
        user_id: user.id,
        asset_type: "image",
        file_name: filename,
        storage_key: asset.path,
        public_url: asset.public_url,
        file_size: asset.size,
        mime_type: asset.mime_type
      })
      .select()
      .single();
      
    if (dbError) {
      throw dbError;
    }
    
    // 4. Update Reference Count (Single Source of Truth)
    await ReferenceManager.attach(asset.id, "project_media", mediaData.id);
    
    return { success: true, data: mediaData };
  } catch (error: any) {
    console.error("Save AI Image Error:", error);
    return { error: error.message || "Failed to save AI image" };
  }
}
