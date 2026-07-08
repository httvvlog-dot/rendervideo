import { ProviderRuntimeOptions, ExecuteParams, ProviderAdapter } from "./types"
import { CredentialSelector } from "./credential-selector"
import { RetryEngine } from "./retry-engine"

export * from "./types"
export * from "./adapters"

export class ProviderRuntime {
  private selector: CredentialSelector;
  private engine: RetryEngine;

  constructor(providerKey: string, options?: ProviderRuntimeOptions) {
    const defaultOptions: ProviderRuntimeOptions = {
      retryCount: 2,
      retryDelay: 1000,
      timeout: 30000,
      failureThreshold: 3,
      ...options
    };

    this.selector = new CredentialSelector(providerKey);
    this.engine = new RetryEngine(defaultOptions);
  }

  async execute<TArgs, TResult>(adapter: ProviderAdapter<TArgs, TResult>, params: ExecuteParams<TArgs>): Promise<TResult> {
    const credentials = await this.selector.getActiveCredentials();
    
    if (!credentials || credentials.length === 0) {
      throw new Error(`ProviderRuntime: No active credentials found for this provider.`);
    }

    let lastGlobalError = null;

    // Failover loop
    for (const cred of credentials) {
      const result = await this.engine.executeWithRetry<TResult>(cred, {
        step: params.step,
        projectId: params.projectId,
        operation: async (credential) => {
          return await adapter.execute(credential, params.args);
        }
      });
      
      if (result.success) {
        return result.data as TResult;
      } else {
        lastGlobalError = result.error;
        console.warn(`ProviderRuntime: Credential ${cred.credential_name} failed. Failing over...`);
      }
    }

    throw lastGlobalError || new Error("All provider credentials failed during execution.");
  }
}
