import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const email = 'xuananh0190@gmail.com';
  
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
  const user = users?.users.find(u => u.email === email);
  console.log('Auth User ID:', user?.id);
  
  if (!user) return;
  
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
  console.log('Profile ID:', profile?.id);
  
  const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', user.id).single();
  console.log('Wallet:', wallet);
  
  const { data: buckets } = await supabase.from('wallet_credit_buckets').select('*').eq('wallet_id', wallet?.id);
  console.log('Buckets:', buckets);
  
  const { data: txs } = await supabase.from('wallet_transactions').select('*').eq('wallet_id', wallet?.id).order('created_at', { ascending: false }).limit(20);
  console.log('Transactions:', txs);
  
  const { data: projects } = await supabase.from('projects').select('id').eq('user_id', user.id);
  console.log('Projects Count:', projects?.length);

  const { data: allTxs } = await supabase.from('wallet_transactions').select('amount, status').eq('wallet_id', wallet?.id).eq('status', 'COMPLETED');
  const lifetimeUsed = allTxs?.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const lifetimePurchased = allTxs?.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  console.log('Calculated Lifetime Used:', lifetimeUsed);
  console.log('Calculated Lifetime Purchased:', lifetimePurchased);
}
run();
