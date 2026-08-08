export type PipelineStep = "SCRIPT" | "VOICE" | "SCENE" | "IMAGE" | "RENDER" | "UPLOAD" | "TEST";

export const PROVIDER_HEALTH_STATUS = {
  HEALTHY: "healthy",
  WARNING: "warning",
  OFFLINE: "offline",
  RATE_LIMITED: "rate_limited",
  UNAUTHORIZED: "unauthorized",
  TIMEOUT: "timeout",
  UNKNOWN: "unknown",
} as const;

export type ProviderHealthStatus = typeof PROVIDER_HEALTH_STATUS[keyof typeof PROVIDER_HEALTH_STATUS];

export type CredentialHealthStatus = "VALID" | "INVALID" | "UNAUTHORIZED" | "UNKNOWN" | "DISABLED";
export type RuntimeStatus = "HEALTHY" | "RATE_LIMITED" | "TIMEOUT" | "NETWORK_ERROR" | "UNKNOWN";

export interface TestConnectionResult {
  status: CredentialHealthStatus;
  runtimeStatus: RuntimeStatus;
  latency: number;       // ms
  provider: string;      
  message?: string;
  capabilities?: string[];
  details?: any;
}

export interface CredentialAdapter {
  normalizeConfig(config: any): any;
  validateCredential(config: any): TestConnectionResult;
  testConnection(options: { credential: any }): Promise<TestConnectionResult>;
}

export interface ProviderRuntimeOptions {
  retryCount?: number;
  retryDelay?: number; // ms
  timeout?: number; // ms
  failureThreshold?: number;
}

export interface UsageMetadata {
  provider: string;
  model: string;
  pricingType: 'token' | 'character' | 'image' | 'second' | 'none';
  promptTokens?: number;
  completionTokens?: number;
  characters?: number;
  images?: number;
  durationSeconds?: number;
  resolution?: string;
}

export interface ProviderExecutionResult<T = any> {
  result: T;
  usage: UsageMetadata;
  cost?: number; // Legacy or external provider returned cost
}

export interface ProviderAdapter<TArgs = any, TResult = any> {
  execute(credential: any, args: TArgs): Promise<ProviderExecutionResult<TResult>>;
  listModels?(credential: any): Promise<{ id: string; name: string }[]>;
}

export interface ExecuteParams<TArgs> {
  step: PipelineStep;
  projectId?: string;
  args: TArgs;
}
