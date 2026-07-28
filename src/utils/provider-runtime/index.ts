import { ProviderRuntimeOptions, ExecuteParams, ProviderAdapter, ProviderExecutionResult, PipelineStep } from "./types"
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

  async invoke<TResult>(
    operation: (credential: any) => Promise<ProviderExecutionResult<TResult>>,
    params: { step: PipelineStep; projectId?: string; }
  ): Promise<ProviderExecutionResult<TResult> & { credentialId?: string }> {
    const credentials = await this.selector.getActiveCredentials();
    
    if (!credentials || credentials.length === 0) {
      throw new Error(`ProviderRuntime: No active credentials found for this provider. Key used: ${this.selector['providerKey']}`);
    }

    let lastGlobalError = null;

    // Failover loop
    for (const cred of credentials) {
      console.log(`[Trace] 5. Selected Credential ID: ${cred.id}`);
      const result = await this.engine.executeWithRetry<ProviderExecutionResult<TResult>>(cred, {
        step: params.step,
        projectId: params.projectId,
        operation: async (credential) => {
          return await operation(credential);
        }
      });
      
      if (result.success) {
        return { ...result.data, credentialId: cred.id } as ProviderExecutionResult<TResult> & { credentialId?: string };
      } else {
        lastGlobalError = result.error;
        console.warn(`ProviderRuntime: Credential ${cred.credential_name} failed. Failing over...`);
      }
    }

    throw lastGlobalError || new Error("All provider credentials failed during execution.");
  }

  async execute<TArgs, TResult>(adapter: ProviderAdapter<TArgs, TResult>, params: ExecuteParams<TArgs>): Promise<ProviderExecutionResult<TResult> & { credentialId?: string }> {
    return this.invoke((credential) => adapter.execute(credential, params.args), params);
  }
}
