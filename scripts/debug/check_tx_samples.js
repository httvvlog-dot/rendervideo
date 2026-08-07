import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data } = await supabase.from('wallet_transactions').select('*').eq('status', 'COMPLETED').limit(5);
  console.log('Sample transactions:', JSON.stringify(data, null, 2));
}
run();
