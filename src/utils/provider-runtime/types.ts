export type PipelineStep = "SCRIPT" | "VOICE" | "SCENE" | "RENDER" | "UPLOAD" | "TEST";

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

export interface ProviderRuntimeOptions {
  retryCount?: number;
  retryDelay?: number; // ms
  timeout?: number; // ms
  failureThreshold?: number;
}

export interface ProviderAdapter<TArgs, TResult> {
  execute(credential: any, args: TArgs): Promise<TResult>;
}

export interface ExecuteParams<TArgs> {
  step: PipelineStep;
  projectId?: string;
  args: TArgs;
}
