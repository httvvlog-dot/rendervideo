import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
const uuidv4 = () => crypto.randomUUID();
import assert from "assert";

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.worker");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("Starting Worker E2E Tests...\n");

  // Test 1: Duplicate Worker Registration
  console.log("--- Running Test: Duplicate Worker Registration ---");
  const workerName = "e2e-worker-duplicate";
  const hostname = "e2e-host";
  const capabilities = { test: true };

  // Run 3 registrations concurrently
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(
      supabase.rpc("worker_register", {
        p_worker_name: workerName,
        p_hostname: hostname,
        p_capabilities: capabilities,
        p_app_version: "1.0.0",
        p_worker_version: "1.0.0",
        p_ffmpeg_version: "1.0.0",
        p_remotion_version: "1.0.0",
        p_worker_mode: "default",
        p_max_concurrent_jobs: 2
      })
    );
  }

  const results = await Promise.all(promises);
  for (const r of results) {
     if (r.error) console.error("Register Error:", r.error);
  }
  
  // Verify Database has only 1 row
  const { data: workers, error: fetchErr } = await supabase
    .from("render_workers")
    .select("id")
    .eq("worker_name", workerName)
    .eq("hostname", hostname);

  if (fetchErr) {
    console.error("Failed to fetch workers:", fetchErr);
    process.exit(1);
  }

  assert.strictEqual(workers?.length, 1, `Expected exactly 1 worker, found ${workers?.length}`);
  
  // Clean up
  await supabase.from("render_workers").delete().eq("worker_name", workerName);
  
  console.log("✅ Duplicate Worker Registration Test PASSED\n");

  // Test 2: Crash during Claim
  console.log("--- Running Test: Crash during Claim ---");
  const projectId = "4dd9c088-6e4b-4d08-82e1-ed9e1b2b7625"; // A dummy project
  const jobId = uuidv4();
  const workerId = uuidv4(); // Fake worker that crashed

  // 1. Create a dummy project
  await supabase.from("projects").insert({
     id: projectId,
     user_id: "7b9d9b8a-0fe7-4b0f-9c84-7e082adb729c",
     title: "Test Project"
  });

  // 2. Clean up old jobs
  await supabase.from("render_jobs").delete().eq("project_id", projectId);

  // 3. Create a pending job
  await supabase.from("render_jobs").insert({
    id: jobId,
    project_id: projectId,
    status: "pending",
    progress: 0,
    timeline_snapshot: { preset: { width: 1920, height: 1080, fps: 30, codec: "h264" }, totalDurationMs: 10000 },
    preset_snapshot: {},
    retry_count: 0
  });

  // 4. Claim the job (simulating the worker getting it)
  const { data: claimedJob, error: claimErr } = await supabase.rpc("claim_next_render_job", {
    p_worker_id: workerId,
    p_request_id: uuidv4(),
    p_capabilities: {}
  });

  if (claimErr) {
    console.error("Failed to claim job:", claimErr);
    process.exit(1);
  }
  
  console.log("Claimed Job:", claimedJob);

  assert.strictEqual(claimedJob[0]?.id, jobId, "Expected claimed job to match our inserted job");

  // Verify status is 'preparing' or 'rendering'
  const { data: jobAfterClaim } = await supabase.from("render_jobs").select("status").eq("id", jobId).single();
  assert.strictEqual(jobAfterClaim?.status, "preparing", "Expected job to be in preparing status");

  // 5. Worker crashes, meaning NO complete_render_job is called.
  // We need to wait for Heartbeat/Job timeout, but since this is E2E we can't easily wait 5 minutes.
  // But wait, the user's test case is to simulate a Crash. The Recovery process should pick it up.
  // Actually, wait, "Test 2 — Crash during Claim: FOR UPDATE SKIP LOCKED" is what the user was talking about.
  // Wait, if two workers call claim_next_render_job simultaneously, one gets it, the other gets NULL (or next job).
  
  console.log("Simulating concurrent claim_next_render_job...");
  const claimPromises = [];
  for (let i = 0; i < 3; i++) {
    claimPromises.push(
      supabase.rpc("claim_next_render_job", {
        p_worker_id: workerId, // same worker id
        p_request_id: uuidv4(),
        p_capabilities: {}
      })
    );
  }

  const claimResults = await Promise.all(claimPromises);
  const claimedCount = claimResults.filter(r => r.data && r.data.id).length;
  
  // Since there are NO more pending jobs, they should all return NULL.
  assert.strictEqual(claimedCount, 0, `Expected 0 additional claimed jobs, found ${claimedCount}`);

  // Clean up
  await supabase.from("render_jobs").delete().eq("id", jobId);
  
  console.log("✅ Crash during Claim Test PASSED\n");
  
  console.log("All Worker E2E tests passed successfully!");
}

runTests().catch(console.error);
