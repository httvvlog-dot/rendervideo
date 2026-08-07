import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: tx } = await supabase
    .from('wallet_transactions')
    .select('id, amount, status, feature, reference_id, created_at')
    .eq('user_id', '1d159c39-8939-4668-b019-e9d8778c05a7')
    .eq('status', 'PENDING');
    
  const jobIds = tx?.map(t => t.reference_id).filter(Boolean) || [];
  
  if (jobIds.length > 0) {
    const { data: jobs, error } = await supabase
      .from('render_jobs')
      .select('id, status, created_at, project_id')
      .in('id', jobIds);
    console.dir(jobs, { depth: null });
    console.log("Error:", error);
  }
}
run();
