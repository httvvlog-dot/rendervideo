import { HealthService } from "./diagnostics";

export interface FeatureCapability {
  available: boolean;
  reason?: string;
}

export interface SystemCapabilities {
  image_generation: FeatureCapability;
  voice_generation: FeatureCapability;
  render_video: FeatureCapability;
}

let capabilitiesCache: SystemCapabilities | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export class CapabilityService {
  static async getCapabilities(force: boolean = false): Promise<SystemCapabilities> {
    const now = Date.now();
    if (!force && capabilitiesCache && (now - lastCacheTime) < CACHE_TTL_MS) {
      return capabilitiesCache;
    }

    // HealthService uses its own cache internally, so calling it here is cheap.
    const health = await HealthService.getHealth();

    const capabilities: SystemCapabilities = {
      image_generation: { available: true },
      voice_generation: { available: true },
      render_video: { available: true }
    };

    // --- Image Generation Capability Logic ---
    // If BOTH fal and openrouter are missing/error, image gen is down.
    if (health.providers.fal !== "OK" && health.providers.openrouter !== "OK") {
      capabilities.image_generation.available = false;
      capabilities.image_generation.reason = "All Image Providers Offline or Missing API Keys";
    }

    // --- Voice Generation Capability Logic ---
    if (health.providers.elevenlabs !== "OK") {
      capabilities.voice_generation.available = false;
      capabilities.voice_generation.reason = "ElevenLabs API Offline or Missing API Key";
    }

    // --- Render Capability Logic ---
    // Placeholder logic for RenderWorker
    // capabilities.render_video.available = false;

    capabilitiesCache = capabilities;
    lastCacheTime = now;
    
    return capabilities;
  }
}
