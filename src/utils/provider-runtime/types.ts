export type PipelineStep = "SCRIPT" | "VOICE" | "SCENE" | "RENDER" | "UPLOAD" | "TEST";

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
