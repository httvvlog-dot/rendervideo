import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://loeoprxsabbqlhouhrgm.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) throw new Error("Missing key");
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc("get_schema_info_or_something", {}); // wait, I can just query information_schema or just insert and see
  const { data: d2, error: e2 } = await supabase.from("storage_files").insert({
    bucket: "taovideo",
    path: "test-key-2",
    mime_type: "video/mp4",
    size: 100,
    public_url: "http://test",
    content_hash: "abcde",
    generation_type: "RENDER"
  }).select();
  console.log("Error:", e2);
  console.log("Data:", d2);
}
check();
