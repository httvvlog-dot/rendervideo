import { TimelineJSON } from "./core";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { spawn } from "child_process";

// @ffmpeg-installer/ffmpeg resolves to the absolute path of the ffmpeg binary
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

export interface RenderAdapter {
  prepare(jobId: string, timeline: TimelineJSON): Promise<void>;
  render(onProgress: (progress: number) => Promise<void>): Promise<string>;
  upload(localOutputPath: string, projectId: string, jobId: string): Promise<{ url: string, key: string }>;
  cleanup(): Promise<void>;
}

export class FFmpegAdapter implements RenderAdapter {
  private workDir: string = "";
  private outputFilePath: string = "";
  private timeline: TimelineJSON | null = null;
  private ffmpegPath: string;

  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || ffmpegInstaller.path;
  }

  async prepare(jobId: string, timeline: TimelineJSON): Promise<void> {
    this.timeline = timeline;
    this.workDir = path.join(os.tmpdir(), `render-${jobId}`);
    this.outputFilePath = path.join(this.workDir, "output.mp4");
    
    await fs.mkdir(this.workDir, { recursive: true });

    // Deduplicate downloads based on sourceUrl
    const downloadCache = new Map<string, string>(); // sourceUrl -> localFilePath

    for (let i = 0; i < timeline.scenes.length; i++) {
      const scene = timeline.scenes[i];
      
      try {
        new URL(scene.sourceUrl); // Validate URL
      } catch (e) {
        throw new Error(`Invalid sourceUrl for scene ${scene.id}`);
      }

      if (downloadCache.has(scene.sourceUrl)) {
        continue; // Already downloaded
      }

      // Safe filename using hash or base64 to avoid collisions
      const safeFilename = `media_${scene.id.replace(/[^a-zA-Z0-9]/g, '')}.jpg`;
      const localPath = path.join(this.workDir, safeFilename);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      try {
        const res = await fetch(scene.sourceUrl, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const contentLength = res.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > 50 * 1024 * 1024) { // 50MB max
          throw new Error("Asset exceeds maximum allowed size (50MB)");
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length === 0) {
          throw new Error("Downloaded asset is empty");
        }

        await fs.writeFile(localPath, buffer);
        downloadCache.set(scene.sourceUrl, localPath);
      } catch (err: any) {
        throw new Error(`Failed to download asset for scene ${scene.id}: ${err.message}`);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Deduplicate downloads based on sourceUrl
    if (timeline.audioTracks) {
      for (let i = 0; i < timeline.audioTracks.length; i++) {
        const audio = timeline.audioTracks[i];
        
        try {
          new URL(audio.sourceUrl); // Validate URL
        } catch (e) {
          throw new Error(`Invalid sourceUrl for audio ${audio.id}`);
        }

        if (downloadCache.has(audio.sourceUrl)) {
          continue; // Already downloaded
        }

        const safeFilename = `audio_${audio.id.replace(/[^a-zA-Z0-9]/g, '')}.mp3`;
        const localPath = path.join(this.workDir, safeFilename);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        try {
          const res = await fetch(audio.sourceUrl, { signal: controller.signal });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText}`);
          }

          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.length === 0) {
            throw new Error("Downloaded audio asset is empty");
          }

          await fs.writeFile(localPath, buffer);
          downloadCache.set(audio.sourceUrl, localPath);
        } catch (err: any) {
          throw new Error(`Failed to download audio for track ${audio.id}: ${err.message}`);
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }
  }

  async render(onProgress: (progress: number) => Promise<void>): Promise<string> {
    if (!this.timeline) throw new Error("Timeline not prepared");

    const scenes = this.timeline.scenes;
    const { width, height, fps, codec } = this.timeline.preset;

    // Hard cuts MVP architecture
    const inputs: string[] = [];
    const filterComplex: string[] = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const safeFilename = `media_${scene.id.replace(/[^a-zA-Z0-9]/g, '')}.jpg`;
      const localPath = path.join(this.workDir, safeFilename);
      
      inputs.push("-loop", "1", "-t", (scene.durationMs / 1000).toString(), "-i", localPath);
      
      // Scale and crop to output canvas (e.g. 1080x1920)
      // Using standard scale, crop, setsar to ensure uniformity
      filterComplex.push(`[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1[v${i}]`);
    }

    // Concat the video streams
    const concatInput = scenes.map((_, i) => `[v${i}]`).join('');
    filterComplex.push(`${concatInput}concat=n=${scenes.length}:v=1:a=0[outv]`);

    // Process audio tracks
    const audioTracks = this.timeline.audioTracks || [];
    let nextInputIndex = scenes.length;
    
    // Generate silent base track matching exact timeline duration as an input (lavfi)
    const durationSec = (this.timeline.totalDurationMs / 1000).toFixed(3);
    inputs.push("-f", "lavfi", "-t", durationSec, "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
    const baseAudioIndex = nextInputIndex++;
    
    let amixInputs = `[${baseAudioIndex}:a]`;
    let amixCount = 1;
    
    for (let i = 0; i < audioTracks.length; i++) {
      const audio = audioTracks[i];
      const safeFilename = `audio_${audio.id.replace(/[^a-zA-Z0-9]/g, '')}.mp3`;
      const localPath = path.join(this.workDir, safeFilename);
      
      inputs.push("-i", localPath);
      const inputIdx = nextInputIndex++;
      
      // Convert mono to stereo, ensure sample rate, then delay
      filterComplex.push(`[${inputIdx}:a]aformat=channel_layouts=stereo:sample_rates=44100,adelay=${audio.startTimeMs}|${audio.startTimeMs}[a${i}]`);
      amixInputs += `[a${i}]`;
      amixCount++;
    }

    if (amixCount > 1) {
      // duration=first ensures the mixed output stops when the baseaudio stops (exact timeline duration)
      // Add volume filter to undo amix's automatic 1/N volume reduction
      filterComplex.push(`${amixInputs}amix=inputs=${amixCount}:duration=first:dropout_transition=0,volume=${amixCount}.0[outa]`);
    } else {
      filterComplex.push(`[${baseAudioIndex}:a]anull[outa]`);
    }

    const args = [
      "-y",
      ...inputs,
      "-filter_complex", filterComplex.join("; "),
      "-map", "[outv]",
      "-map", "[outa]",
      "-c:v", codec || "libx264",
      "-r", fps.toString(),
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      this.outputFilePath
    ];

    console.log(`FFmpeg Command: ${this.ffmpegPath} ${args.join(" ")}`);

    return new Promise((resolve, reject) => {
      const child = spawn(this.ffmpegPath, args);

      let totalDurationSec = this.timeline!.totalDurationMs / 1000;

      child.stderr.on("data", (data) => {
        const text = data.toString();
        console.error("[FFmpeg stderr]:", text); // Temporarily added to debug crash
        // Parse time=00:00:05.12 to get progress
        const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const seconds = parseFloat(timeMatch[3]);
          const currentTime = (hours * 3600) + (minutes * 60) + seconds;
          
          let p = (currentTime / totalDurationSec) * 100;
          if (p > 100) p = 100;
          
          onProgress(p).catch(console.error);
        }
      });

      child.on("close", (code) => {
        console.log(`[FFmpeg] Process exited with code ${code}`);
        if (code === 0) {
          resolve(this.outputFilePath);
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      child.on("error", (err) => {
        reject(err);
      });
    });
  }

  async upload(localOutputPath: string, projectId: string, jobId: string): Promise<{ url: string, key: string }> {
    const { ProviderRuntime } = await import("../provider-runtime");
    const { CloudflareR2Adapter } = await import("../provider-runtime/adapters/cloudflare-r2-adapter");

    const runtime = new ProviderRuntime("cloudflare_r2");
    
    // Read the MP4 buffer
    const buffer = await fs.readFile(localOutputPath);
    
    const objectKey = `renders/${projectId}/${jobId}/output.mp4`;

    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Upload] Attempt ${attempt}/3 to upload ${objectKey}`);
        const res = await runtime.execute(new CloudflareR2Adapter(), {
          step: "UPLOAD",
          projectId: projectId,
          args: {
            action: "UPLOAD",
            fileBuffer: buffer,
            fileName: "output.mp4",
            mimeType: "video/mp4",
            projectId: projectId,
            objectKey: objectKey
          }
        });

        if (!res.publicUrl) {
          throw new Error("R2 upload succeeded but returned no public URL");
        }

        console.log(`[Upload] Success! URL: ${res.publicUrl}`);
        return { url: res.publicUrl, key: objectKey };
      } catch (err: any) {
        lastError = err;
        console.warn(`[Upload] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 2000 * attempt)); // Exponential backoff
        }
      }
    }

    throw new Error(`Failed to upload to R2 after 3 attempts: ${lastError?.message}`);
  }

  async cleanup(): Promise<void> {
    if (!this.workDir) return;
    try {
      await fs.rm(this.workDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("Cleanup failed:", e);
    }
  }
}
