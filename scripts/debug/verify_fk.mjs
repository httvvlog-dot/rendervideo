import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://loeoprxsabbqlhouhrgm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching a sample project...");
  const { data: project, error: fetchErr } = await supabase.from('projects').select('id, user_id, voice_template_id').limit(1).single();
  if (fetchErr || !project) return console.log("No projects found", fetchErr);
  
  const projectId = project.id;
  const userId = project.user_id;
  console.log("Selected Project ID:", projectId);
  
  // 3. Get Lam Vy voice preset (or any active voice)
  console.log("\n=== STEP 3: Checking if value exists in voice_presets ===");
  const { data: voice, error: vErr } = await supabase.from('voice_presets').select('id, display_name').limit(1).single();
  if (vErr || !voice) return console.log("No voices found in voice_presets", vErr);
  console.log(`Found voice in voice_presets: ${voice.display_name} (ID: ${voice.id})`);

  // 4. Log server action exact result
  console.log("\n=== STEP 4: Logging updateProjectVoice() output & PostgreSQL error ===");
  console.log("Attempting to UPDATE projects SET voice_template_id =", voice.id);
  const { error: projErr } = await supabase
    .from("projects")
    .update({ voice_template_id: voice.id })
    .eq("id", projectId)
    .eq("user_id", userId);
    
  if (projErr) {
    console.log("UPDATE ERROR!");
    console.log(JSON.stringify(projErr, null, 2));
  } else {
    console.log("UPDATE SUCCESSFUL! (No DB error)");
  }

  // 2 & 5. Query after selecting voice
  console.log("\n=== STEP 2 & 5: Querying the projects row immediately after UPDATE ===");
  const { data: updatedProject, error: finalErr } = await supabase.from('projects').select('id, voice_template_id').eq('id', projectId).single();
  if (finalErr) console.log("Error querying project:", finalErr);
  else console.log(`Resulting voice_template_id in DB: ${updatedProject.voice_template_id === null ? "NULL" : updatedProject.voice_template_id}`);
}

run();
