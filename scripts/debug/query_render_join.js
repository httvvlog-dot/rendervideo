const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: jobs, error } = await supabase
    .from('render_jobs')
    .select('*, projects(user_id)')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (error) console.error(error);
  else {
    console.log(JSON.stringify(jobs, null, 2));
  }
}

main();

