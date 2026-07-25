import { ProviderAdapter } from "../types";
import { OpenRouterAdapter } from "./openrouter-adapter";
import { ElevenLabsAdapter } from "./elevenlabs-adapter";
import { CloudflareR2Adapter } from "./cloudflare-r2-adapter";
import { 
  OpenAIImageAdapter, 
  FalImageAdapter, 
  ReplicateImageAdapter, 
  StabilityImageAdapter, 
  IdeogramImageAdapter 
} from "./image-adapters";

export class AdapterRegistry {
  private static adapters: Record<string, new () => ProviderAdapter> = {};

  static register(providerKey: string, adapterClass: new () => ProviderAdapter) {
    this.adapters[providerKey] = adapterClass;
  }

  static unregister(providerKey: string) {
    delete this.adapters[providerKey];
  }

  static get(providerKey: string): ProviderAdapter | null {
    const AdapterClass = this.adapters[providerKey];
    if (!AdapterClass) {
      return null;
    }
    return new AdapterClass();
  }
}

// Register default adapters
AdapterRegistry.register("openrouter", OpenRouterAdapter);
AdapterRegistry.register("elevenlabs", ElevenLabsAdapter);
AdapterRegistry.register("cloudflare_r2", CloudflareR2Adapter as any); // Type cast due to different args/result types currently in CloudflareR2Adapter if it exists
AdapterRegistry.register("openai", OpenAIImageAdapter);
AdapterRegistry.register("falai", FalImageAdapter);
AdapterRegistry.register("replicate", ReplicateImageAdapter);
AdapterRegistry.register("stability", StabilityImageAdapter);
AdapterRegistry.register("ideogram", IdeogramImageAdapter);

// Keep AdapterFactory for backward compatibility during transition if needed, 
// but point it to Registry
export class AdapterFactory {
  static getAdapter(providerKey: string): any {
    return AdapterRegistry.get(providerKey);
  }
}
