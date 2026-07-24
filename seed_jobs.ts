import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.worker" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  for (let i = 0; i < 5; i++) {
    await supabase.from("render_jobs").insert({
      project_id: "00000000-0000-0000-0000-000000000000",
      status: "pending",
      timeline_snapshot: { type: "test", id: i },
      preset_snapshot: { resolution: "1080p" }
    });
  }
  console.log("5 jobs created.");
}
main();
