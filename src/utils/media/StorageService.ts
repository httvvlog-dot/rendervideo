import { ProviderRuntime } from "@/utils/provider-runtime";
import { CloudflareR2Adapter } from "@/utils/provider-runtime/adapters/cloudflare-r2-adapter";

export class StorageService {
  /**
   * Abstracted deletion that hides the underlying provider from the caller.
   */
  static async delete(provider: string, objectKey: string, projectId: string = "system"): Promise<boolean> {
    try {
      if (provider === "cloudflare_r2") {
        const runtime = new ProviderRuntime("cloudflare_r2", {
          retryCount: 3,
          retryDelay: 1000,
          failureThreshold: 3
        });
        
        await runtime.execute(new CloudflareR2Adapter(), {
          step: "UPLOAD",
          projectId,
          args: {
            action: "DELETE",
            objectKey: objectKey
          }
        });
        return true;
      }
      
      console.warn(`[StorageService] Unsupported provider for deletion: ${provider}`);
      return false;
    } catch (error) {
      console.error(`[StorageService] Failed to delete ${objectKey} from ${provider}:`, error);
      return false;
    }
  }
}