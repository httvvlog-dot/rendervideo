const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY'
);

async function checkSections() {
  const projectId = '4e3f9bcf-9bd1-4507-90ff-ba3c92204794';
  const { data: project } = await supabase.from('projects').select('active_script_id').eq('id', projectId).single();
  
  if (!project) return console.log('Project not found');
  
  const { data: sections } = await supabase.from('script_sections').select('id, section_index, voice_media_id, narration').eq('script_id', project.active_script_id).order('section_index', { ascending: true });
  
  console.log('Sections:');
  console.table(sections);
  
  const { data: media } = await supabase.from('project_media').select('id, file_name, asset_type').eq('project_id', projectId);
  console.log('Project Media:');
  console.table(media);
}

checkSections();
