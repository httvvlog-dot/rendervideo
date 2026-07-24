import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.worker" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.from("render_jobs").insert({
    project_id: "4dd9c088-6e4b-4d08-82e1-ed9e1b2b7625",
    status: "pending",
    timeline_snapshot: { type: "test", fail_on_purpose: true },
    preset_snapshot: { resolution: "1080p" }
  }).select();
  if (error) {
    console.error(error);
  } else {
    console.log("Poison job created:", data[0].id);
  }
}
main();
