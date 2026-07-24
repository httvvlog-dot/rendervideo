import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.worker' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  console.log('--- Đang gọi RPC cấp 200 Bonus Credit ---');
  
  const { data: profile } = await supabase.from('profiles').select('id, email').eq('email', 'xuananh0190@gmail.com').single();
  
  const res = await supabase.rpc('grant_credits', {
    p_user_id: profile!.id,
    p_amount: 200,
    p_bucket_type: 'WELCOME_BONUS',
    p_expires_at: null,
    p_description: 'Test cấp 200 credit tự động'
  });

  if (res.error) {
    console.error('Lỗi khi gọi RPC:', res.error);
    return;
  }
  
  console.log('Kết quả RPC:', res.data);

  console.log('\n--- 1. Kiểm tra bucket mới (wallet_credit_buckets) ---');
  const w = await supabase.from('wallets').select('id, balance_credits').eq('user_id', profile!.id).single();
  const b = await supabase.from('wallet_credit_buckets').select('*').eq('wallet_id', w.data!.id).order('created_at', { ascending: false }).limit(1);
  console.log(b.data);

  console.log('\n--- 2. Kiểm tra giao dịch (wallet_transactions) ---');
  const t = await supabase.from('wallet_transactions').select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(1);
  console.log(t.data);

  console.log('\n--- 3. Kiểm tra số dư ví (wallets.balance_credits) ---');
  console.log('Số dư hiện tại:', w.data!.balance_credits);
}

run();
