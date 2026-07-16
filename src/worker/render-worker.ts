import { createClient } from "@supabase/supabase-js";
import { FFmpegAdapter } from "../utils/render/ffmpeg";
import { RENDER_JOB_STATUS } from "../utils/render/core";
import dotenv from "dotenv";

// Load environment variables for local testing
dotenv.config({ path: ".env.local" });

// D6 — Worker Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKER_ID = process.env.RENDER_WORKER_ID || `worker-${Math.random().toString(36).substring(7)}`;
const POLL_INTERVAL_MS = parseInt(process.env.RENDER_POLL_INTERVAL_MS || "5000", 10);
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.RENDER_HEARTBEAT_INTERVAL_MS || "15000", 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing required Supabase credentials in environment (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function claimNextJob() {
  const { data, error } = await supabase.rpc("claim_next_render_job", {
    p_worker_id: WORKER_ID
  });

  if (error) {
    console.error("Error claiming job:", error);
    return null;
  }
  
  if (data && data.id) {
    return data;
  }
  return null;
}

// D5 — Heartbeat support
async function sendHeartbeat(jobId: string) {
  await supabase.from("render_jobs").update({
    heartbeat_at: new Date().toISOString()
  }).eq("id", jobId);
}

async function processJob(job: any) {
  console.log(`[${WORKER_ID}] Processing job ${job.id}`);
  const adapter = new FFmpegAdapter();
  
  // Start Heartbeat interval
  const heartbeatTimer = setInterval(() => {
    sendHeartbeat(job.id).catch(console.error);
  }, HEARTBEAT_INTERVAL_MS);

  const startTime = performance.now();
  let prepareTime = 0;
  let renderTime = 0;
  let uploadTime = 0;

  try {
    // 1. Prepare
    const t0 = performance.now();
    await supabase.from("render_jobs").update({
      status: RENDER_JOB_STATUS.PREPARING,
      progress_message: "Downloading assets...",
      heartbeat_at: new Date().toISOString()
    }).eq("id", job.id).eq("worker_id", WORKER_ID);
    
    await adapter.prepare(job.id, job.timeline_snapshot);
    prepareTime = (performance.now() - t0) / 1000;

    // 2. Render
    const t1 = performance.now();
    await supabase.from("render_jobs").update({
      status: RENDER_JOB_STATUS.RENDERING,
      progress_message: "Rendering video...",
      heartbeat_at: new Date().toISOString()
    }).eq("id", job.id).eq("worker_id", WORKER_ID);

    const outputPath = await adapter.render(async (progress) => {
      // D4 — Clamp progress
      let p = Math.max(0, Math.min(progress, 99));
      await supabase.from("render_jobs").update({
        progress: p,
        progress_message: `Rendering... ${Math.round(p)}%`,
        heartbeat_at: new Date().toISOString()
      }).eq("id", job.id).eq("worker_id", WORKER_ID);
    });
    renderTime = (performance.now() - t1) / 1000;

    // 3. Upload
    const t2 = performance.now();
    await supabase.from("render_jobs").update({
      status: RENDER_JOB_STATUS.UPLOADING,
      progress_message: "Uploading output...",
      heartbeat_at: new Date().toISOString()
    }).eq("id", job.id).eq("worker_id", WORKER_ID);

    // D1 — Real Cloudflare R2 Upload
    const { url: outputUrl, key: outputKey } = await adapter.upload(outputPath, job.project_id, job.id);
    uploadTime = (performance.now() - t2) / 1000;

    // Get file size
    const stat = await import("fs/promises").then(fs => fs.stat(outputPath));
    const fileSize = stat.size;

    // 4. Update Database (D2)
    // 4.1 Update previous outputs to not current
    await supabase.from("project_outputs")
      .update({ is_current: false })
      .eq("project_id", job.project_id)
      .eq("is_current", true);

    // 4.2 Calculate next version
    const { data: latestOutput } = await supabase.from("project_outputs")
      .select("version")
      .eq("project_id", job.project_id)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    
    const nextVersion = latestOutput ? latestOutput.version + 1 : 1;

    // 4.3 Insert into project_outputs
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

    // 4.4 Update render_jobs
    await supabase.from("render_jobs").update({
      status: RENDER_JOB_STATUS.COMPLETED,
      progress: 100,
      progress_message: "Completed",
      output_url: outputUrl,
      finished_at: new Date().toISOString(),
      error_message: null
    }).eq("id", job.id).eq("worker_id", WORKER_ID);

    const totalTime = (performance.now() - startTime) / 1000;
    const memUsage = process.memoryUsage();
    
    console.log(`\n======================================`);
    console.log(`✅ [RENDER COMPLETE]`);
    console.log(`Job ID:      ${job.id}`);
    console.log(`Project ID:  ${job.project_id}`);
    console.log(`Version:     ${nextVersion}`);
    console.log(`Video FPS:   ${job.timeline_snapshot.preset.fps}`);
    console.log(`Duration:    ${(job.timeline_snapshot.totalDurationMs / 1000).toFixed(2)}s`);
    console.log(`File Size:   ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`--- Performance Metrics ---`);
    console.log(`Prepare:     ${prepareTime.toFixed(2)}s`);
    console.log(`FFmpeg:      ${renderTime.toFixed(2)}s`);
    console.log(`Upload:      ${uploadTime.toFixed(2)}s`);
    console.log(`Total Time:  ${totalTime.toFixed(2)}s`);
    console.log(`--- System Metrics ---`);
    console.log(`Mem (RSS):   ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Mem (Heap):  ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Output:      ${outputUrl}`);
    console.log(`======================================\n`);

  } catch (err: any) {
    console.error(`[${WORKER_ID}] Job ${job.id} failed:`, err);
    // D4 — Handle Failure State
    await supabase.from("render_jobs").update({
      status: RENDER_JOB_STATUS.FAILED,
      error_message: err.message || "Unknown error during render pipeline",
      finished_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString()
    }).eq("id", job.id).eq("worker_id", WORKER_ID);
  } finally {
    clearInterval(heartbeatTimer);
    await adapter.cleanup();
  }
}

async function runWorkerDaemon() {
  console.log(`Starting Render Worker [${WORKER_ID}]`);
  console.log(`Poll interval: ${POLL_INTERVAL_MS}ms, Heartbeat: ${HEARTBEAT_INTERVAL_MS}ms`);
  
  while (true) {
    try {
      // First, attempt to requeue stale jobs using the RPC we created
      await supabase.rpc("requeue_stale_render_jobs", {
        p_timeout_minutes: 15,
        p_max_attempts: 3
      });

      const job = await claimNextJob();
      if (job) {
        await processJob(job);
      } else {
        // Queue empty, sleep
        await new Promise(res => setTimeout(res, POLL_INTERVAL_MS));
      }
    } catch (err) {
      console.error("Worker daemon error loop:", err);
      await new Promise(res => setTimeout(res, POLL_INTERVAL_MS));
    }
  }
}

// Start polling
runWorkerDaemon();
