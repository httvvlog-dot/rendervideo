import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const userId = '1d159c39-8939-4668-b019-e9d8778c05a7';
  
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId);
    
  console.log('Wallets count:', wallet?.length);
  console.dir(wallet, { depth: null });
  
  // Also get the RPC definition for reserve_credits
  const { data: rpc, error } = await supabase
    .rpc('get_function_definition', { func_name: 'reserve_credits' });
    
  if (error) {
    console.log("Cannot get rpc definition this way. Let's try raw SQL via RPC or just ignore.");
  } else {
    console.log('RPC:', rpc);
  }
}

run();
