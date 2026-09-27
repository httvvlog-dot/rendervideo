const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

