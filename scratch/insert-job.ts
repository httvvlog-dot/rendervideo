import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.worker" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: user } = await supabase.from("profiles").select("id").limit(1).single();
  const userId = user?.id || null;
  console.log("Using user ID:", userId);

  const { data: project } = await supabase.from("projects").select("id").limit(1).single();
  const projectId = project?.id;

  const { data, error } = await supabase.from("render_jobs").insert({
    project_id: projectId,
    status: "pending",
    preset_snapshot: { width: 1920, height: 1080, fps: 30 },
    timeline_snapshot: { version: 1, duration: 10 },
    priority: "NORMAL",
    // NOTE: no user_id column in this table, wait, let's see if it errors
  }).select().single();
  
  if (error) console.error("Insert error:", error);
  else console.log("Inserted job:", data.id);
}
run();
