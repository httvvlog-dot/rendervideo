import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runSmokeTest() {
  console.log("=== HATARA LIVE SMOKE TEST ===")

  // 1. Dashboard Metrics
  console.log("TEST 1: Admin Dashboard")
  const { data: metrics, error: metricsErr } = await supabase.rpc("get_admin_global_statistics")
  if (metricsErr) {
    console.error("FAIL: Could not load metrics", metricsErr)
  } else {
    console.log("PASS: Metrics loaded successfully")
  }

  // 2. Users
  console.log("TEST 2: Users")
  const { data: users, error: usersErr } = await supabase.from("profiles").select("id").limit(1)
  if (usersErr) {
    console.error("FAIL: Could not load users", usersErr)
  } else {
    console.log("PASS: Users loaded successfully")
  }

  // Find a test user and project
  const testUserId = users?.[0]?.id
  if (!testUserId) {
    console.error("No test user found, aborting render test")
    return
  }

  const { data: projects } = await supabase.from("projects").select("id").eq("user_id", testUserId).limit(1)
  const testProjectId = projects?.[0]?.id

  if (!testProjectId) {
    console.error("No test project found for user", testUserId)
    return
  }

  // Create a Render Job
  console.log("\nTEST 7: CREATE RENDER JOB")
  const timelineSnapshot = {
    version: 1,
    projectId: testProjectId,
    timelineVersion: 1,
    totalDurationMs: 3000,
    preset: { aspectRatio: "16:9", width: 1280, height: 720, fps: 30, codec: "h264" },
    scenes: [
      {
        id: "scene-1",
        sectionId: "sec-1",
        mediaId: null,
        sourceUrl: null, // Just a blank color scene if no media
        startTimeMs: 0,
        endTimeMs: 3000,
        durationMs: 3000,
        transition: { type: "none", durationMs: 0 },
        transform: { startScale: 1, endScale: 1, startX: 0, endX: 0, startY: 0, endY: 0, opacity: 1 }
      }
    ]
  }

  const { data: job, error: jobErr } = await supabase.from("render_jobs").insert({
    project_id: testProjectId,
    status: "queued",
    progress: 0,
    timeline_snapshot: timelineSnapshot,
    preset_snapshot: { width: 1280, height: 720, fps: 30, codec: "h264", quality: "Standard" }
  }).select().single()

  if (jobErr) {
    console.error("FAIL: Could not create render job", jobErr)
    return
  }

  console.log(`PASS: Created Render Job ID: ${job.id}`)

  // Monitor Job
  console.log("\nTEST 8: MONITOR RENDER LIFECYCLE")
  let lastStatus = "queued"
  let lastProgress = 0
  let isDone = false
  let attempts = 0

  while (!isDone && attempts < 60) {
    attempts++
    const { data: currentJob } = await supabase.from("render_jobs").select("*").eq("id", job.id).single()
    if (!currentJob) break

    if (currentJob.status !== lastStatus || currentJob.progress !== lastProgress) {
      console.log(`[${new Date().toISOString()}] STATUS: ${currentJob.status} | PROGRESS: ${currentJob.progress}% | MSG: ${currentJob.progress_message || 'None'}`)
      
      if (currentJob.status !== 'queued' && lastStatus === 'queued') {
         console.log(`Worker Claimed! Worker ID: ${currentJob.worker_id}`)
         console.log(`Started At: ${currentJob.started_at}`)
      }

      lastStatus = currentJob.status
      lastProgress = currentJob.progress
    }

    if (currentJob.status === "completed" || currentJob.status === "failed") {
      isDone = true
      console.log("\nFINAL JOB STATE:")
      console.log(`Status: ${currentJob.status}`)
      console.log(`Error: ${currentJob.error_message || "None"}`)
      console.log(`Output: ${currentJob.output_url || "None"}`)
      console.log(`Finished At: ${currentJob.finished_at}`)
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  if (!isDone) {
    console.log("TIMEOUT: Job did not finish within 120 seconds")
  }
}

runSmokeTest().catch(console.error)
