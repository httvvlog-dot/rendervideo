import { RenderAdapter, TimelineJSON } from "./types";
import path from "path";
import fs from "fs/promises";
import os from "os";

export class FFmpegAdapter implements RenderAdapter {
  private cacheDir = path.join(os.tmpdir(), "taovideo_cache");
  private workDir = path.join(os.tmpdir(), `render_${Date.now()}`);
  private currentTimeline: TimelineJSON | null = null;
  private outputFilePath: string = path.join(this.workDir, "output.mp4");

  constructor() {}

  async downloadAssets(timeline: TimelineJSON): Promise<void> {
    this.currentTimeline = timeline;
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.mkdir(this.workDir, { recursive: true });
    
    // TODO: Loop through timeline.assets
    // If not in this.cacheDir, download from R2 using storage URL
    // Map JSON asset IDs to local cached file paths
  }

  async validateAssets(): Promise<void> {
    // TODO: Verify each file in cache is accessible and size > 0
  }

  async prepare(timeline: TimelineJSON): Promise<void> {
    // TODO: Generate FFmpeg filter_complex string
    // This involves reading timeline.scenes, mapping to inputs,
    // applying zoompan based on animation.start_scale etc.,
    // applying crossfades based on transition parameters,
    // and concatenating them.
  }

  async render(onProgress: (status: string, progress: number, details?: any) => void): Promise<string> {
    onProgress("rendering", 0, { message: "Starting FFmpeg process" });
    
    // TODO: Spawn fluent-ffmpeg or child_process with the generated filter_complex
    // Parse stdout/stderr to update progress
    // Wait for completion

    onProgress("encoding", 100, { message: "FFmpeg encoding complete" });
    return this.outputFilePath;
  }

  async verify(localPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(localPath);
      return stats.size > 0;
    } catch {
      return false;
    }
  }

  async upload(localPath: string): Promise<string> {
    // TODO: Use R2 adapter to upload output.mp4
    // return public URL
    return "https://r2.example.com/output.mp4";
  }

  async cleanup(): Promise<void> {
    try {
      // Remove workDir but keep cacheDir
      await fs.rm(this.workDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("Cleanup failed:", e);
    }
  }
}
