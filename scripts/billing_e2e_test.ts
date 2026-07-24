import { createClient } from "@supabase/supabase-js";
import assert from "assert";

// Native UUID generator
const uuidv4 = () => crypto.randomUUID();

// Bypass RLS with service role for E2E Tests
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runTests() {
  console.log("Starting Billing E2E Tests...");
  
  // Create a dummy user for the test
  const userId = "7b9d9b8a-0fe7-4b0f-9c84-7e082adb729c";
  const workerId = uuidv4();
  const projectId = "4dd9c088-6e4b-4d08-82e1-ed9e1b2b7625";

  // Test 3: Duplicate Commit Concurrency Test
  console.log("\n--- Running Test: Duplicate Commit Test (Idempotency) ---");
  const jobId = uuidv4();
  
  // 0. Clean up any existing render jobs for this project
  await supabase.from("render_jobs").delete().eq("project_id", projectId);

  // 1. Create fake job
  const { error: insertErr } = await supabase.from("render_jobs").insert({
    id: jobId,
    project_id: projectId,
    status: "rendering",
    progress: 50,
    timeline_snapshot: { preset: { width: 1920, height: 1080, fps: 30, codec: "h264" }, totalDurationMs: 10000 },
    preset_snapshot: {},
    retry_count: 0
  });
  if (insertErr) {
    console.error("Insert Job Failed:", insertErr);
    process.exit(1);
  }

  // 2. Reserve credits manually via RPC
  const { data: reserveRes, error: resErr } = await supabase.rpc("reserve_credits", {
    p_user_id: userId,
    p_amount: 10,
    p_feature: "Render",
    p_reference_type: "render_jobs",
    p_reference_id: jobId,
    p_provider: "render_worker",
    p_description: "Test Reserve",
    p_metadata: {},
    p_timeout_minutes: 15
  });
  
  if (resErr) {
     console.error("Reserve failed:", resErr);
     process.exit(1);
  }
  
  const txId = reserveRes[0].transaction_id;
  console.log(`Reserved credits for job ${jobId}. Transaction ID: ${txId}`);

  // 3. Concurrently call complete_render_job multiple times to simulate race condition
  console.log("Simulating concurrent complete_render_job calls...");
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(supabase.rpc("complete_render_job", {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_output_url: `https://test.com/output_${i}.mp4`,
      p_usage_metadata: { test: true },
      p_usd_cost: 0,
      p_request_id: `test-req-${i}`
    }));
  }

  const results = await Promise.all(promises);
  console.log("Concurrent calls completed. Checking results...");
  
  let successCount = 0;
  for (const r of results) {
    if (r.error) {
       console.error("RPC Error:", r.error);
    }
    if (r.data === true) successCount++;
  }
  
  console.log(`Success count returned from RPC: ${successCount}`);
  
  // 4. Verify wallet_transactions
  const { data: txs } = await supabase.from("wallet_transactions")
    .select("status")
    .eq("reference_type", "render_jobs")
    .eq("reference_id", jobId)
    .order("created_at", { ascending: true });
    
  console.log("Transactions for job:", txs?.map(t => t.status));
  
  const commitCount = txs?.filter(t => t.status === 'COMPLETED').length || 0;
  assert.strictEqual(commitCount, 1, `Expected exactly 1 COMPLETED transaction, found ${commitCount}`);
  
  console.log("✅ Duplicate Commit Test PASSED");

  console.log("\nAll tests passed successfully!");
}

runTests().catch(err => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
