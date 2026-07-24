import { createClient } from "@supabase/supabase-js";
import { compileTimeline } from "./src/utils/render/compile-timeline";
import dotenv from "dotenv";

dotenv.config({ path: ".env.worker" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function runTest() {
  const projectId = "4e3f9bcf-9bd1-4507-90ff-ba3c92204794";
  console.log(`[Test] Compiling timeline for project: ${projectId}`);
  
  try {
    const timeline = await compileTimeline(supabase, projectId, true);
    console.log(`[Test] Timeline compiled successfully. Total Duration: ${timeline.totalDurationMs}ms, Scenes: ${timeline.scenes.length}`);
    
    console.log(`[Test] Inserting Render Job...`);
    const { data: job, error } = await supabase.from('render_jobs').insert({
      project_id: projectId,
      status: 'pending',
      progress: 0,
      timeline_snapshot: timeline,
      preset_snapshot: timeline.preset,
    }).select().single();

    if (error) {
      console.error("[Test] Failed to insert job:", error);
      return;
    }

    console.log(`[Test] Job inserted with ID: ${job.id}. Polling status...`);

    // Poll every 2 seconds
    const interval = setInterval(async () => {
      const { data: currentJob } = await supabase.from('render_jobs').select('status, progress, error_message, output_url').eq('id', job.id).single();
      
      if (!currentJob) return;
      
      console.log(`[Status] ${currentJob.status} - Progress: ${currentJob.progress}%`);
      
      if (currentJob.status === 'completed') {
        console.log(`\n✅ [Test SUCCESS] Video rendered! URL: ${currentJob.output_url}`);
        clearInterval(interval);
        process.exit(0);
      } else if (currentJob.status === 'failed') {
        console.log(`\n❌ [Test FAILED] Error: ${currentJob.error_message}`);
        clearInterval(interval);
        process.exit(1);
      }
    }, 2000);

  } catch (err) {
    console.error("[Test] Exception:", err);
  }
}

runTest();
