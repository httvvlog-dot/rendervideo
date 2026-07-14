export * from "./openrouter-adapter";
export * from "./cloudflare-r2-adapter";
export * from "./elevenlabs-adapter";

export interface WhisperArgs { audioBuffer: Buffer; }
export interface WhisperResult { srtContent: string; durationSec: number; }
export class WhisperAdapter {
  async execute(credential: any, args: WhisperArgs): Promise<WhisperResult> {
    throw new Error("Not implemented");
  }
}

export interface RenderWorkerArgs { projectId: string; template: string; }
export interface RenderWorkerResult { jobId: string; estimatedTimeSec: number; }
export class RenderWorkerAdapter {
  async execute(credential: any, args: RenderWorkerArgs): Promise<RenderWorkerResult> {
    throw new Error("Not implemented");
  }
}
