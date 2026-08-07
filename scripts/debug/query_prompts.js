const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const projectId = '570e426f-8af1-431d-bcc3-bf4e927d76a9';
  const { data: sections } = await supabase.from('script_sections').select('section_index, image_prompt, visual_description').eq('project_id', projectId).order('section_index');
  console.log(sections);
}
run();
