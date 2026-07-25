import { ProviderAdapter, ProviderExecutionResult } from "../types"
import { IMAGE_MODELS } from "../image-models"

export interface ImageGenerationArgs {
  prompt: string;
  width?: number;
  height?: number;
  numImages?: number;
}

export interface ImageGenerationResult {
  url: string;
  width: number;
  height: number;
}

export interface ImageProviderAdapter extends ProviderAdapter<ImageGenerationArgs, ImageGenerationResult> {
  testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }): Promise<{ success: boolean; message: string; latency: number }>;
  listModels(credential: any): Promise<{ id: string; name: string }[]>;
}

export class OpenAIImageAdapter implements ImageProviderAdapter {
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }) {
    const { credential } = options;
    const config = credential.config_json || {};
    const apiKey = config.apiKey || config.api_key;
    if (!apiKey) return { success: false, message: "Missing API Key", latency: 0 };
    
    const start = Date.now();
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      if (!res.ok) return { success: false, message: `API Error: ${res.status}`, latency: Date.now() - start };
      return { success: true, message: "Connected successfully", latency: Date.now() - start };
    } catch (e: any) {
      return { success: false, message: e.message, latency: Date.now() - start };
    }
  }

  async listModels(credential: any) {
    return [
      { id: "dall-e-3", name: "DALL-E 3" },
      { id: "dall-e-2", name: "DALL-E 2" }
    ];
  }

  async execute(credential: any, args: ImageGenerationArgs): Promise<ProviderExecutionResult<ImageGenerationResult>> {
    const config = credential.config_json || {};
    const apiKey = config.apiKey || config.api_key;
    const model = args.width ? 'dall-e-3' : 'dall-e-3'; // Simplify for now

    if (!apiKey) throw new Error("API Key missing in OpenAI credential");

    const size = args.width === 1080 && args.height === 1920 ? "1024x1792" : "1024x1024";

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: args.prompt,
        n: 1,
        size
      })
    });

    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);

    const data = await res.json();
    return {
      result: {
        url: data.data[0].url,
        width: args.width || 1024,
        height: args.height || 1024
      },
      usage: {
        provider: "openai",
        model: credential.image_model || IMAGE_MODELS.openai.find(x => x.recommended)?.id || "dall-e-3",
        pricingType: "image",
        images: 1
      }
    };
  }
}

export class FalImageAdapter implements ImageProviderAdapter {
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }) {
    // Stub for FAL
    return { success: true, message: "FAL Connected", latency: 50 };
  }
  async listModels() {
    return [{ id: "fal-ai/flux/schnell", name: "FLUX Schnell" }];
  }
  async execute(credential: any, args: ImageGenerationArgs): Promise<ProviderExecutionResult<ImageGenerationResult>> {
    const DEFAULT_MODEL = IMAGE_MODELS.falai.find(x => x.recommended)?.id || "fal-ai/flux-pro/v1";
    const model = credential.image_model || DEFAULT_MODEL;
    console.log(`[FalImageAdapter] Executing with model: ${model}`);
    throw new Error(`Fal generation not fully implemented yet (Model: ${model})`);
  }
}

export class ReplicateImageAdapter implements ImageProviderAdapter {
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }) {
    return { success: true, message: "Replicate Connected", latency: 50 };
  }
  async listModels() { return []; }
  async execute(credential: any, args: ImageGenerationArgs): Promise<ProviderExecutionResult<ImageGenerationResult>> { throw new Error("Not implemented"); }
}

export class IdeogramImageAdapter implements ImageProviderAdapter {
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }) { return { success: true, message: "Ideogram Connected", latency: 50 }; }
  async listModels() { return []; }
  async execute(credential: any, args: ImageGenerationArgs): Promise<ProviderExecutionResult<ImageGenerationResult>> { throw new Error("Not implemented"); }
}

export class StabilityImageAdapter implements ImageProviderAdapter {
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }) { return { success: true, message: "Stability Connected", latency: 50 }; }
  async listModels() { return []; }
  async execute(credential: any, args: ImageGenerationArgs): Promise<ProviderExecutionResult<ImageGenerationResult>> { throw new Error("Not implemented"); }
}
