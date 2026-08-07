import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const projectId = 'f95f4978-7f7d-4700-967e-369e199af3cc';
  
  const { data: jobs } = await supabase.from('image_jobs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(2);
  console.log("Latest Image Jobs:");
  console.dir(jobs, { depth: null });
}

run();
