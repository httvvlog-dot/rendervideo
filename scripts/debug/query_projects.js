const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const email = 'xuananh0190@gmail.com';
  
  // 1. Get user
  const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
  const userId = profile?.id;

  const { data: projects } = await supabase.from('projects').select('id, name, topic').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
  console.log(projects);
}
run();
