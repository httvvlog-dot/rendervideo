import { ProviderRuntimeOptions, ExecuteParams, ProviderAdapter, ProviderExecutionResult } from "./types"
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
  async getDefaultModel(): Promise<string | null> {
    const credentials = await this.selector.getActiveCredentials();
    if (!credentials || credentials.length === 0) return null;
    // Attempt to parse config_json to find the default model
    const config = credentials[0].config_json || {};
    return config.defaultModel || config.default_model || null;
  }

  async execute<TArgs, TResult>(adapter: ProviderAdapter<TArgs, TResult>, params: ExecuteParams<TArgs>): Promise<ProviderExecutionResult<TResult>> {
    const credentials = await this.selector.getActiveCredentials();
    
    if (!credentials || credentials.length === 0) {
      console.error("ProviderRuntime Debug Log:");
      console.error(`providerKey: ${this.selector['providerKey']}`);
      // credentials empty so no count except 0
      console.error("credentials found: 0");
      
      // Let's manually check what is in the provider_credentials table
      const adminClient = require('@/utils/supabase/admin').createAdminClient();
      const { data: pData } = await adminClient.from("providers").select("id").eq("provider_key", this.selector['providerKey']).single();
      console.error(`providerId: ${pData?.id}`);
      
      if (pData?.id) {
        const { data: allCreds } = await adminClient.from("provider_credentials").select("id, credential_name, is_active, health_status").eq("provider_id", pData.id);
        console.error("All credentials for this provider:", JSON.stringify(allCreds));
      }
      
      throw new Error(`ProviderRuntime: No active credentials found for this provider. Key used: ${this.selector['providerKey']}`);
    }

    let lastGlobalError = null;

    // Failover loop
    for (const cred of credentials) {
      const result = await this.engine.executeWithRetry<ProviderExecutionResult<TResult>>(cred, {
        step: params.step,
        projectId: params.projectId,
        operation: async (credential) => {
          return await adapter.execute(credential, params.args);
        }
      });
      
      if (result.success) {
        return result.data as ProviderExecutionResult<TResult>;
      } else {
        lastGlobalError = result.error;
        console.warn(`ProviderRuntime: Credential ${cred.credential_name} failed. Failing over...`);
      }
    }

    throw lastGlobalError || new Error("All provider credentials failed during execution.");
  }
}
