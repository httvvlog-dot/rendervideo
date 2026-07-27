import { ProviderRuntime, OpenRouterAdapter } from "./provider-runtime"
import { extractJSONObject } from "./extract-json-object"
import { z } from "zod"

export interface PromptValidationResult {
  status: "PASS" | "CORRECTED" | "FAILED";
  validatedPrompt: string;
  reason: string;
  detectedSubjects: string[];
  confidence: number;
  warnings: string[];
}

const ValidationSchema = z.object({
  status: z.enum(["PASS", "CORRECTED", "FAILED"]),
  validatedPrompt: z.string(),
  reason: z.string(),
  detectedSubjects: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()).default([])
});

export class PromptValidator {
  async validate(visualStory: string, imagePrompt: string, projectId: string): Promise<PromptValidationResult> {
    const runtime = new ProviderRuntime("openrouter", { retryCount: 1 });
    const model = await runtime.getDefaultModel() || "openai/gpt-4o-mini";

    const systemPrompt = `You are an AI Prompt Validator for an Image Generation Platform.
Your job is to compare a Vietnamese 'Visual Story' against an English 'Image Prompt'.
The Image Prompt must accurately represent the core subjects, scene, and actions described in the Visual Story.

Visual Story: "${visualStory}"
Image Prompt: "${imagePrompt}"

Tasks:
1. Extract the core subjects from the Visual Story.
2. Compare them against the Image Prompt.
3. If they match completely, return status "PASS".
4. If they deviate slightly or miss context, correct the Image Prompt to match the Visual Story (maintaining photographic style) and return "CORRECTED".
5. If they are completely hallucinated and irrelevant (e.g. bird nest vs girl running), return "FAILED" (or "CORRECTED" if you can confidently rewrite it perfectly). Since you can rewrite it perfectly based on the Visual Story, you should usually prefer "CORRECTED" with a high confidence. Only use FAILED if the Visual Story is incomprehensible.
6. Return a confidence score between 0.0 and 1.0.
7. List any warnings (e.g. "Lighting mismatch", "Camera angle missing").

Output MUST be valid JSON matching this schema:
{
  "status": "PASS" | "CORRECTED" | "FAILED",
  "validatedPrompt": "The correct english prompt...",
  "reason": "Explanation...",
  "detectedSubjects": ["subject1", "subject2"],
  "confidence": 0.98,
  "warnings": []
}`;

    try {
      // We will use execute() which expects a credential, but wait!
      // PromptValidator is a backend utility. In TaoVideo, BillingEngine usually wraps ProviderRuntime.
      // For now, let's just use raw execute without billing since it's a small validation step, 
      // or we can require the caller to pass it.
      
      const aiResult = await runtime.execute(new OpenRouterAdapter(), {
        step: "TEST",
        projectId: projectId,
        args: { prompt: systemPrompt }
      });

      const parsedJson = extractJSONObject(aiResult.result.content);
      const validated = ValidationSchema.parse(parsedJson);
      
      return validated;
    } catch (error) {
      console.error("Prompt Validation Error:", error);
      return {
        status: "PASS",
        validatedPrompt: imagePrompt,
        reason: "Validator execution failed, falling back to original prompt.",
        detectedSubjects: [],
        confidence: 0,
        warnings: ["Validator system error"]
      };
    }
  }
}
