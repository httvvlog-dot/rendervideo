const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY'
);

async function checkScenes() {
  const projectId = '4e3f9bcf-9bd1-4507-90ff-ba3c92204794';
  const { data: scenes, error } = await supabase.from('project_scenes').select('*').eq('project_id', projectId).order('sort_order', { ascending: true });
  
  if (error) console.error(error);
  else {
    console.log('Project Scenes length:', scenes.length);
  }
}

checkScenes();
