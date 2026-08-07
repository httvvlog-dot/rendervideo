import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: projects } = await supabase.from("projects").select("id, title, active_script_id").order("created_at", { ascending: false }).limit(1);
  if (!projects || projects.length === 0) return;
  const project = projects[0];
  console.log("Latest Project:", project);
  
  const { data: sections } = await supabase.from("script_sections").select("id, section_index, title, duration_seconds, voice_duration_ms").eq("script_id", project.active_script_id).order("section_index");
  console.log("Sections:", sections?.length);
  console.table(sections);
  
  const { data: voices } = await supabase.from("audio_assets").select("id, section_id, duration_ms, status").eq("project_id", project.id).eq("audio_type", "voice");
  console.log("Voices:", voices?.length);
  console.table(voices);
  
  const { data: media } = await supabase.from("project_media").select("id, section_id").eq("project_id", project.id);
  console.log("Media:", media?.length);
  console.table(media);
  
  const { data: scenes } = await supabase.from("project_scenes").select("id, section_id, start_time, end_time").eq("project_id", project.id);
  console.log("Scenes:", scenes?.length);
  console.table(scenes);
}
run();
