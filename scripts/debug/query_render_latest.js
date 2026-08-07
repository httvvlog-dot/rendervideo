const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY'
);

async function main() {
  const { data: jobs, error } = await supabase
    .from('render_jobs')
    .select('id, status, error_message, created_at, finished_at, progress_message')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) console.error(error);
  else {
    console.log(JSON.stringify(jobs, null, 2));
  }
}

main();
