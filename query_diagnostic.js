const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const email = 'xuananh0190@gmail.com';
  
  // 1. Get user
  const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
  const userId = profile?.id;

  // 3. Find the project for "kinh tế toàn cầu"
  const { data: projects, error: pErr } = await supabase.from('projects')
    .select('id, topic')
    .eq('user_id', userId)
    .ilike('topic', '%kinh tế%');
  
  if (!projects || projects.length === 0) { console.log('Project not found', pErr); return; }
  const project = projects[projects.length - 1]; // latest
  console.log(`\n--- PROJECT ---`);
  console.log(`ID: ${project.id}, Topic: ${project.topic}`);

  // 4. Find the scripts for this project
  const { data: scripts } = await supabase.from('scripts')
    .select('*')
    .eq('project_id', project.id)
    .order('version', { ascending: false });

  if (scripts && scripts.length > 0) {
      const script = scripts[0];
      console.log(`\n--- SCRIPT ---`);
      console.log(`ID: ${script.id}, Version: ${script.version}`);
      console.log(`Word count: ${script.word_count}, Tokens in: ${script.tokens_input}, Tokens out: ${script.tokens_output}`);
      console.log(`Model: ${script.model}`);
      console.log(`Duration MS: ${script.duration_ms}`);
      console.log(`Prompt: ${script.prompt?.substring(0, 100)}...`);
      
      const { data: sections } = await supabase.from('script_sections')
        .select('*')
        .eq('script_id', script.id)
        .order('section_index', { ascending: true });
        
      console.log(`\n--- SECTIONS (${sections?.length}) ---`);
      sections?.forEach(s => {
          console.log(`[Section ${s.section_index}] Word count: ${s.word_count}`);
          // console.log(`Content: ${s.content?.substring(0, 50)}...`);
      });
  }

  // 5. Image jobs for this project
  const { data: imageJobs } = await supabase.from('image_jobs')
    .select('id, status, error_message, section_id')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });

  console.log(`\n--- IMAGE JOBS (${imageJobs?.length}) ---`);
  imageJobs?.forEach(j => {
      console.log(`[Job ${j.id}] Status: ${j.status}, Error: ${j.error_message}, Section: ${j.section_id}`);
  });
  
  // 6. Script Jobs
  const { data: scriptJobs } = await supabase.from('script_jobs')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });
  console.log(`\n--- SCRIPT JOBS (${scriptJobs?.length}) ---`);
  scriptJobs?.forEach(j => {
      console.log(`[Job ${j.id}] Provider: ${j.provider_id}, Model: ${j.model_id}, TokenIn: ${j.tokens_input}, TokenOut: ${j.tokens_output}`);
      if (j.provider_request) {
          const params = j.provider_request.parameters || {};
          console.log(`Params: temp=${params.temperature}, max_tokens=${params.max_tokens}, top_p=${params.top_p}`);
          const msgs = j.provider_request.messages || [];
          if (msgs.length > 0) {
              console.log(`Sys Prompt: ${msgs[0].content?.substring(0, 200)}...`);
          }
      }
  });
}
run().catch(console.error);
