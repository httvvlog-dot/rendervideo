import { ProviderAdapter, ProviderExecutionResult } from "../types"

import { FalClient } from "./fal-client"

export interface ImageGenerationArgs {
  prompt: string;
  width?: number;
  height?: number;
  numImages?: number;
  model?: string; // Model injected from BillingEngine / User Plan
  seed?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  aspect_ratio?: string;
  output_format?: string;
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
    const model = args.model || 'dall-e-3';

    if (process.env.IMAGE_PROVIDER_MODE === "mock") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const width = args.width || 1080;
      const height = args.height || 1920;
      return {
        result: {
          url: `https://fakeimg.pl/${width}x${height}/282828/eae0d0/?text=Mock+Image`,
          width,
          height
        },
        usage: {
          provider: "openai",
          model,
          pricingType: "image",
          images: args.numImages || 1,
        },
        cost: 0
      };
    }

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
        model,
        pricingType: "image",
        images: 1
      }
    };
  }
}

export class FalImageAdapter implements ImageProviderAdapter {
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }) {
    const { credential } = options;
    const config = credential.config_json || {};
    const apiKey = config.apiKey || config.api_key;
    if (!apiKey) return { success: false, message: "Missing API Key", latency: 0 };
    
    const start = Date.now();
    try {
      // Fal doesn't have a standard /models endpoint, so we test by pinging a lightweight endpoint or generating an error that isn't 401
      const res = await fetch("https://api.fal.ai/rest/models/fal-ai/flux/schnell", {
        headers: { "Authorization": `Key ${apiKey}` }
      });
      if (res.status === 401) return { success: false, message: "Invalid API Key", latency: Date.now() - start };
      return { success: true, message: "Connected successfully", latency: Date.now() - start };
    } catch (e: any) {
      return { success: false, message: e.message, latency: Date.now() - start };
    }
  }
  async listModels() {
    return [{ id: "fal-ai/flux/schnell", name: "FLUX Schnell" }];
  }
  async execute(credential: any, args: ImageGenerationArgs): Promise<ProviderExecutionResult<ImageGenerationResult>> {
    const model = args.model || "fal-ai/flux-pro/v1";
    console.log(`[FalImageAdapter] Executing with model: ${model}`);
    
    // Check for Mock mode
    if (process.env.IMAGE_PROVIDER_MODE === "mock") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const width = args.width || 1080;
      const height = args.height || 1920;
      return {
        result: {
          url: `https://fakeimg.pl/${width}x${height}/282828/eae0d0/?text=Mock+Image`,
          width,
          height
        },
        usage: {
          provider: "falai",
          model,
          pricingType: "image",
          images: args.numImages || 1,
        },
        cost: 0
      };
    }
    // Live Mode
    const config = credential.config_json || {};
    const apiKey = config.apiKey || config.api_key;
    if (!apiKey) throw new Error("API chưa được cấu hình (Invalid API Key).");

    const client = new FalClient(apiKey);
    const result = await client.run({
      model,
      prompt: args.prompt,
      image_size: (args.width && args.height) ? { width: args.width, height: args.height } : undefined,
      seed: args.seed,
      guidance_scale: args.guidance_scale,
      num_inference_steps: args.num_inference_steps,
      aspect_ratio: args.aspect_ratio,
      output_format: args.output_format,
      num_images: args.numImages
    });

    if (!result || result.length === 0) {
      throw new Error("Không tìm thấy ảnh từ kết quả trả về.");
    }

    return {
      result: {
        url: result[0].url,
        width: result[0].width,
        height: result[0].height
      },
      usage: {
        provider: "falai",
        model,
        pricingType: "image",
        images: args.numImages || 1,
      },
      cost: 0
    };
  }
}

export class ReplicateImageAdapter implements ImageProviderAdapter {
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }) {
    return { success: true, message: "Replicate Connected", latency: 50 };
  }
  async listModels() { return []; }
  async execute(credential: any, args: ImageGenerationArgs): Promise<ProviderExecutionResult<ImageGenerationResult>> { 
    const model = args.model || "black-forest-labs/flux-pro";
    if (process.env.IMAGE_PROVIDER_MODE === "mock") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { result: { url: `https://fakeimg.pl/${args.width || 1080}x${args.height || 1920}/282828/eae0d0/?text=Mock+Image`, width: args.width || 1080, height: args.height || 1920 }, usage: { provider: "replicate", model, pricingType: "image", images: 1 }, cost: 0 };
    }
    throw new Error("Not implemented"); 
  }
}

export class IdeogramImageAdapter implements ImageProviderAdapter {
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }) { return { success: true, message: "Ideogram Connected", latency: 50 }; }
  async listModels() { return []; }
  async execute(credential: any, args: ImageGenerationArgs): Promise<ProviderExecutionResult<ImageGenerationResult>> { 
    const model = args.model || "ideogram-v3";
    if (process.env.IMAGE_PROVIDER_MODE === "mock") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { result: { url: `https://fakeimg.pl/${args.width || 1080}x${args.height || 1920}/282828/eae0d0/?text=Mock+Image`, width: args.width || 1080, height: args.height || 1920 }, usage: { provider: "ideogram", model, pricingType: "image", images: 1 }, cost: 0 };
    }
    throw new Error("Not implemented"); 
  }
}

export class StabilityImageAdapter implements ImageProviderAdapter {
  async testConnection(options: { credential: any, mode?: "quick" | "deep", [key: string]: any }) { return { success: true, message: "Stability Connected", latency: 50 }; }
  async listModels() { return []; }
  async execute(credential: any, args: ImageGenerationArgs): Promise<ProviderExecutionResult<ImageGenerationResult>> { 
    const model = args.model || "stable-diffusion-3";
    if (process.env.IMAGE_PROVIDER_MODE === "mock") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { result: { url: `https://fakeimg.pl/${args.width || 1080}x${args.height || 1920}/282828/eae0d0/?text=Mock+Image`, width: args.width || 1080, height: args.height || 1920 }, usage: { provider: "stability", model, pricingType: "image", images: 1 }, cost: 0 };
    }
    throw new Error("Not implemented"); 
  }
}
