import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: projects } = await supabase.from("projects").select("id, title, active_script_id").not("active_script_id", "is", null).order("created_at", { ascending: false }).limit(5);
  for (const project of projects || []) {
      const { data: voices } = await supabase.from("audio_assets").select("id").eq("project_id", project.id).eq("audio_type", "voice");
      if (voices && voices.length > 0) {
          console.log("Found project with voices:", project.id, project.title);
          
          const { data: sections } = await supabase.from("script_sections").select("id, section_index, title, duration_seconds, voice_duration_ms").eq("script_id", project.active_script_id).order("section_index");
          console.table(sections);
          
          const { data: v } = await supabase.from("audio_assets").select("id, section_id, duration_ms, status").eq("project_id", project.id).eq("audio_type", "voice");
          console.table(v);
          
          const { data: media } = await supabase.from("project_media").select("id, section_id").eq("project_id", project.id);
          console.log("Media Count:", media?.length);
          
          const { data: scenes } = await supabase.from("project_scenes").select("id, section_id, start_time, end_time").eq("project_id", project.id);
          console.log("Scenes Count:", scenes?.length);
          
          return;
      }
  }
  console.log("No projects found with voices.");
}
run();
