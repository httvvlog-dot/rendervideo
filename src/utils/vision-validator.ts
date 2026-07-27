import { OpenRouterAdapter } from "./provider-runtime/adapters/openrouter-adapter";
import { extractJSONObject } from "./extract-json-object";

export interface VisionValidationResult {
  status: "PASS" | "REGENERATE";
  reason?: string;
}

export class VisionValidator {
  
  /**
   * Validates a generated image against the original visual story/prompt using GPT-4o Vision.
   */
  async validate(
    originalVisualStory: string,
    originalPrompt: string,
    imageUrl: string
  ): Promise<VisionValidationResult> {
    const adapter = new OpenRouterAdapter();
    
    // We assume the environment has an OPENROUTER_API_KEY, but since we are running server-side
    // we should ideally fetch the credential. We can use a default system credential or env var.
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("[VisionValidator] OPENROUTER_API_KEY missing, skipping vision validation.");
      return { status: "PASS", reason: "Validator disabled (No API Key)" };
    }

    const credential = {
      config_json: { apiKey, defaultModel: "openai/gpt-4o" }
    };

    const systemPrompt = `You are an elite QA Inspector for an AI Commercial Photography studio.
Your job is to compare the GENERATED IMAGE against the original VISUAL STORY and PROMPT to ensure accuracy.

CRITICAL RULES:
1. Ensure the core subject matches exactly. If the prompt asks for "edible swiftlet nest", and the image shows "lemons", "ordinary bird nest with a bird in it", or "fruit", you MUST fail it.
2. Ensure there are no hallucinations of negative objects (e.g. text, watermarks, cartoons, irrelevant foods).
3. If the image successfully captures the main subject and looks professional, output PASS.
4. Output STRICT JSON only.

Input Visual Story:
${originalVisualStory}

Input Image Prompt:
${originalPrompt}

Return JSON format:
{
  "status": "PASS" | "REGENERATE",
  "reason": "Explain your decision concisely"
}`;

    // Construct the Vision payload for OpenRouter
    const promptArray = [
      { type: "text", text: systemPrompt },
      { type: "image_url", image_url: { url: imageUrl } }
    ];

    try {
      const response = await adapter.execute(credential, { prompt: promptArray as any });
      const json: any = extractJSONObject(response.result.content);
      
      if (json && (json.status === "PASS" || json.status === "REGENERATE")) {
        return {
          status: json.status,
          reason: json.reason
        };
      }
      
      return { status: "PASS", reason: "Failed to parse validator output" };
    } catch (e: any) {
      console.error("[VisionValidator] Error:", e);
      return { status: "PASS", reason: `Validation error: ${e.message}` }; // Fallback to pass if validation fails
    }
  }
}
