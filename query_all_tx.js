import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = '1d159c39-8939-4668-b019-e9d8778c05a7';
  
  const { data: tx } = await supabase
    .from('wallet_transactions')
    .select('id, amount, status, feature, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
    
  console.dir(tx, { depth: null });
}

run();
