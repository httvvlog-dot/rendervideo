import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: tx } = await supabase.from('wallet_transactions').select('*').eq('user_id', '1d159c39-8939-4668-b019-e9d8778c05a7').eq('status', 'PENDING');
  
  const sum = tx.reduce((acc, t) => acc + Math.abs(t.amount), 0);
  console.log('Pending tx count:', tx.length, 'Sum:', sum);
  
  console.dir(tx.map(t => ({ id: t.id, feature: t.feature, amount: t.amount, created_at: t.created_at })), { depth: null });
}

run();
