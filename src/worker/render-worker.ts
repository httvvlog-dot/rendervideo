import { createClient } from "@supabase/supabase-js";
import { FFmpegAdapter } from "../utils/render/ffmpeg";
import { RENDER_JOB_STATUS } from "../utils/render/core";
import dotenv from "dotenv";
import os from "os";

// Load environment variables for local testing
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.worker" });

// D6 — Worker Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKER_NAME = process.env.WORKER_NAME || `worker-local-${process.pid}`;
const WORKER_MODE = process.env.WORKER_MODE || "local";
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || "1", 10);
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL || "10000", 10);
const QUEUE_POLL_INTERVAL_MIN = parseInt(process.env.QUEUE_POLL_INTERVAL_MIN || "1000", 10);
const QUEUE_POLL_INTERVAL_MAX = parseInt(process.env.QUEUE_POLL_INTERVAL_MAX || "10000", 10);

const APP_VERSION = "0.1.0";
const WORKER_VERSION = "1.2.1";
const FFMPEG_VERSION = "7.0"; // Usually parsed from binary, hardcoded for now
const REMOTION_VERSION = "4.0"; // Hardcoded for now

const CAPABILITIES = {
  schema: 1,
  gpu: true,
  gpu_name: "RTX 4090", // Example
  gpu_memory_gb: 24,
  cpu_threads: os.cpus().length,
  ram_gb: Math.round(os.totalmem() / (1024 ** 3)),
  max_resolution: "3840x2160",
  supported_codecs: ["h264", "hevc"],
  remotion: true,
  ffmpeg: true
};

const START_TIME = Date.now();
let workerId: string | null = null;
let activeJobIds: string[] = [];

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing required Supabase credentials in environment (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function registerWorker() {
  const { data, error } = await supabase.rpc("worker_register", {
    p_worker_name: WORKER_NAME,
    p_hostname: os.hostname(),
    p_worker_mode: WORKER_MODE,
    p_max_concurrent_jobs: MAX_CONCURRENT_JOBS,
    p_app_version: APP_VERSION,
    p_worker_version: WORKER_VERSION,
    p_ffmpeg_version: FFMPEG_VERSION,
    p_remotion_version: REMOTION_VERSION,
    p_capabilities: CAPABILITIES
  });
  
  if (error || !data) {
    console.error("Failed to register worker:", error);
    process.exit(1);
  }
  
  workerId = data;
  console.log(`[Worker] Registered with ID: ${workerId}`);
}

async function sendGlobalHeartbeat() {
  if (!workerId) return;

  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += (cpu.times as any)[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const cpuUsage = Math.round(100 - ~~(100 * idle / total));
  
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const ramUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

  const { error } = await supabase.rpc("worker_heartbeat", {
    p_worker_id: workerId,
    p_cpu_usage: cpuUsage,
    p_ram_usage: ramUsage,
    p_active_jobs: activeJobIds.length,
    p_uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000)
  });

  if (error) {
    console.error("[Worker] Heartbeat failed:", error.message);
    if (error.message.includes("Worker not found")) {
      console.warn("[Worker] Worker record missing in database. Re-registering...");
      await registerWorker();
    }
  }
}

async function claimNextJob() {
  if (!workerId) return null;
  const { data, error } = await supabase.rpc("claim_next_render_job", {
    p_worker_id: workerId,
    p_capabilities: CAPABILITIES,
    p_request_id: `claim-${Date.now()}`
  });

  if (error) {
    console.error("Error claiming job:", error);
    return null;
  }
  
  if (data && data.length > 0 && data[0].id) {
    // Need to fetch full job since RPC only returns id, project_id, status
    const { data: jobData } = await supabase.from("render_jobs").select("*").eq("id", data[0].id).single();
    return jobData;
  }
  return null;
}

async function processJob(job: any) {
  activeJobIds.push(job.id);
  console.log(`[Worker ${WORKER_NAME}] Claimed Job: ${job.id}`);
  const adapter = new FFmpegAdapter();
  
  const startTime = performance.now();
  let prepareTime = 0, renderTime = 0, uploadTime = 0;
  let isSuccess = false;
  let errorMessage = null;

  try {
    const t0 = performance.now();
    await supabase.from("render_jobs").update({
      status: RENDER_JOB_STATUS.PREPARING,
      progress_message: "Downloading assets...",
    }).eq("id", job.id).eq("worker_id", workerId);
    
    await adapter.prepare(job.id, job.timeline_snapshot);
    if (job.timeline_snapshot.fail_on_purpose) {
      throw new Error("Simulated failure for DLQ test");
    }
    prepareTime = (performance.now() - t0) / 1000;

    const t1 = performance.now();
    await supabase.from("render_jobs").update({
      status: RENDER_JOB_STATUS.RENDERING,
      progress_message: "Rendering video...",
    }).eq("id", job.id).eq("worker_id", workerId);

    const outputPath = await adapter.render(async (progress) => {
      let p = Math.max(0, Math.min(progress, 99));
      await supabase.from("render_jobs").update({
        progress: p,
        progress_message: `Rendering... ${Math.round(p)}%`,
      }).eq("id", job.id).eq("worker_id", workerId);
    });
    renderTime = (performance.now() - t1) / 1000;

    const t2 = performance.now();
    await supabase.from("render_jobs").update({
      status: RENDER_JOB_STATUS.UPLOADING,
      progress_message: "Uploading output...",
    }).eq("id", job.id).eq("worker_id", workerId);

    const { url: outputUrl, key: outputKey } = await adapter.upload(outputPath, job.project_id, job.id);
    uploadTime = (performance.now() - t2) / 1000;

    const stat = await import("fs/promises").then(fs => fs.stat(outputPath));
    const fileSize = stat.size;

    await supabase.from("project_outputs").update({ is_current: false }).eq("project_id", job.project_id).eq("is_current", true);

    const { data: latestOutput } = await supabase.from("project_outputs")
      .select("version").eq("project_id", job.project_id).order("version", { ascending: false }).limit(1).single();
    
    const nextVersion = latestOutput ? latestOutput.version + 1 : 1;

    const totalDurationSeconds = Math.round(job.timeline_snapshot.totalDurationMs) / 1000;
    
    // Usage metadata for Billing
    const usageMetadata = {
      provider: "render_worker",
      model: job.timeline_snapshot.preset.codec || "h264",
      pricingType: "second",
      durationSeconds: totalDurationSeconds,
      resolution: `${job.timeline_snapshot.preset.width}x${job.timeline_snapshot.preset.height}`
    };

    const { error: completeErr } = await supabase.rpc("complete_render_job", {
      p_job_id: job.id,
      p_worker_id: workerId,
      p_output_url: outputUrl,
      p_usage_metadata: usageMetadata,
      p_usd_cost: 0,
      p_request_id: `req-${job.id}`
    });

    if (completeErr) {
      console.error(`[Worker ${WORKER_NAME}] Error completing job:`, completeErr);
      throw completeErr;
    }

    try {
      await supabase.from("project_outputs").insert({
        project_id: job.project_id,
        render_job_id: job.id,
        version: nextVersion,
        is_current: true,
        title: `Version ${nextVersion}`,
        output_key: outputKey,
        output_url: outputUrl,
        duration_ms: Math.round(job.timeline_snapshot.totalDurationMs),
        width: job.timeline_snapshot.preset.width,
        height: job.timeline_snapshot.preset.height,
        fps: job.timeline_snapshot.preset.fps,
        file_size: fileSize,
        video_codec: "h264",
        audio_codec: "aac",
        status: "completed"
      });
    } catch (dbErr) {
      console.error(`[Worker ${WORKER_NAME}] Exception inserting into project_outputs:`, dbErr);
    }
    
    isSuccess = true;
    const totalTime = (performance.now() - startTime) / 1000;
    console.log(`[Worker ${WORKER_NAME}] Render complete in ${totalTime.toFixed(2)}s. Job ID: ${job.id}`);
  } catch (err: any) {
    console.error(`[${WORKER_NAME}] Job ${job.id} failed:`, err);
    errorMessage = err.message || "Unknown error";
    await supabase.from("render_jobs").update({
      status: RENDER_JOB_STATUS.PENDING,
      error_message: errorMessage,
      finished_at: new Date().toISOString(),
    }).eq("id", job.id).eq("worker_id", workerId);
  } finally {
    activeJobIds = activeJobIds.filter(id => id !== job.id);
    await adapter.cleanup();
    
    // Update worker metrics and render_worker_jobs history
    const totalTime = (performance.now() - startTime) / 1000;
    await supabase.rpc("worker_update_metrics", {
      p_worker_id: workerId,
      p_job_id: job.id,
      p_is_success: isSuccess,
      p_render_time_seconds: totalTime,
      p_error_message: errorMessage
    });
  }
}

async function bootstrap() {
  console.log(`\n======================================`);
  console.log(`[Worker] Starting Render Node V10.1...`);
  console.log(`[Worker] Mode: ${WORKER_MODE} | Max Concurrent: ${MAX_CONCURRENT_JOBS}`);
  console.log(`[Worker] Name: ${WORKER_NAME}`);
  
  await registerWorker();

  // Start Global Heartbeat
  setInterval(() => {
    sendGlobalHeartbeat().catch(console.error);
  }, HEARTBEAT_INTERVAL_MS);
  
  console.log(`======================================\n`);
  
  let idleCount = 0;
  
  while (true) {
    try {
      if (activeJobIds.length < MAX_CONCURRENT_JOBS) {
        const job = await claimNextJob();
        if (job) {
          idleCount = 0;
          // Fire and forget (allow concurrent if MAX_CONCURRENT_JOBS > 1)
          processJob(job).catch(console.error);
        } else {
          idleCount++;
        }
      } else {
        idleCount++;
      }

      // Adaptive Polling
      let pollInterval = QUEUE_POLL_INTERVAL_MIN;
      if (idleCount > 0) pollInterval = Math.min(QUEUE_POLL_INTERVAL_MIN * 5, QUEUE_POLL_INTERVAL_MAX);
      if (idleCount > 12) pollInterval = QUEUE_POLL_INTERVAL_MAX;
      
      await new Promise(res => setTimeout(res, pollInterval));
    } catch (err) {
      console.error("Worker daemon error loop:", err);
      await new Promise(res => setTimeout(res, QUEUE_POLL_INTERVAL_MAX));
    }
  }
}

// Start polling
bootstrap();
