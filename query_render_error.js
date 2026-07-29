const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY'
);

async function main() {
  console.log('--- LATEST RENDER JOBS ---');
  const { data: jobs, error: errJobs } = await supabase
    .from('render_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (errJobs) console.error(errJobs);
  else {
    for (const j of jobs) {
       console.log(`Job ${j.id} | Status: ${j.status} | Progress: ${j.progress} | Error: ${j.error_message || 'None'}`);
    }
  }

  console.log('\n--- LATEST ERROR LOGS ---');
  const { data: errs, error: errErrs } = await supabase
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (errErrs) console.error(errErrs);
  else {
    for (const err of errs) {
       console.log(`[${err.created_at}] [${err.severity}] [${err.category}] ${err.error_code || err.message}`);
       console.log('Details:', err.error_details || err.context_data);
    }
  }
}

main();
