import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data } = await supabase.from('wallet_transactions').select('transaction_type, amount, status').eq('status', 'COMPLETED');
  const types = [...new Set(data?.map(d => d.transaction_type))];
  console.log('Transaction Types:', types);
}
run();
