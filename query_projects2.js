const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const email = 'xuananh0190@gmail.com';
  
  // 1. Get user
  const { data: profile, error: err1 } = await supabase.from('profiles').select('id').eq('email', email).single();
  const userId = profile?.id;
  console.log('userId:', userId, err1);

  // 3. Find the projects
  const { data: projects, error: err3 } = await supabase.from('projects')
    .select('id, name, topic, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  console.log('projects:', projects?.map(p => p.topic), err3);
}
run();
