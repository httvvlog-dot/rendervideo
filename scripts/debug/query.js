const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: jobs, error: err1 } = await supabase.from('image_jobs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Recent image jobs:", jobs);

  if (jobs && jobs.length > 0) {
    const projectId = jobs[0].project_id;
    console.log("Checking project:", projectId);

    const { data: sections } = await supabase.from('script_sections').select('*').eq('project_id', projectId).order('section_index');
    console.log("Sections count:", sections?.length);

    const { data: media } = await supabase.from('project_media').select('*').eq('project_id', projectId);
    console.log("Project Media count:", media?.length);

    const { data: refMedia } = await supabase.from('asset_references').select('*');
    console.log("Total References (system):", refMedia?.length);
    
    // Log section distribution
    if (sections) {
      console.table(sections.map(s => ({
        id: s.id,
        index: s.section_index,
        media_count: media?.filter(m => m.section_id === s.id).length || 0
      })));
    }
  }
}
run();
