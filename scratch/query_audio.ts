import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { data: v } = await supabase.from("audio_assets").select("*").limit(10);
  console.log("Audio assets:", v?.length);
  console.table(v);
}
run();