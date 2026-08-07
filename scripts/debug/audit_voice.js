require('dotenv').config({ path: '.env.worker' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY'
);

async function run() {
  const projectId = '4e3f9bcf-9bd1-4507-90ff-ba3c92204794';
  
  // Get active script
  const { data: project } = await supabase.from('projects').select('active_script_id').eq('id', projectId).single();
  const scriptId = project.active_script_id;
  
  // Get sections
  const { data: sections } = await supabase.from('script_sections').select('*').eq('script_id', scriptId);
  console.log("Sections count:", sections.length);
  const withVoice = sections.filter(s => s.voice_media_id);
  console.log("Sections with voice_media_id:", withVoice.length);
  
  // Get project_media
  const { data: media } = await supabase.from('project_media').select('*').eq('project_id', projectId).eq('asset_type', 'voice');
  console.log("Voice media rows:", media.length);
  console.log("All voice media resolve:", withVoice.every(s => media.some(m => m.id === s.voice_media_id)));
  console.log("All voice media have public_url:", media.every(m => m.public_url));
}

run();
