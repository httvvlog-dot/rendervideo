import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data, error } = await supabase.from("admin_audit_logs").select("*, users!admin_audit_logs_admin_id_fkey(email)").limit(1);
  console.log("Data:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}
test();
