import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data, error } = await supabase.from("ai_usage_logs").select("*").limit(1);
  console.log("Data:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}
test();
