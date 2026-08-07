const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: project } = await supabase.from('projects').select('target_duration, video_length').eq('id', 'f95f4978-7f7d-4700-967e-369e199af3cc').single();
  console.log('Project durations:', project);
}
run();
