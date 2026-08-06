const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const email = 'xuananh0190@gmail.com';
  console.log(`Checking user: ${email}`);
  
  // 1. Get user ID from auth.users or profiles (we might need to query public.profiles if auth.users is inaccessible or use admin client)
  // Let's check public.profiles first.
  let userId = null;
  const { data: profile } = await supabase.from('profiles').select('id, email').eq('email', email).single();
  if (profile) {
    userId = profile.id;
    console.log(`Found in profiles. ID: ${userId}`);
  } else {
    console.log(`Not found in profiles. Attempting fallback...`);
    // Fallback if email is not in profiles. Maybe it's in auth.users? But we need admin privileges for that, which SERVICE_ROLE_KEY has.
    const { data: authUser, error: authErr } = await supabase.auth.admin.listUsers();
    if (authUser && authUser.users) {
        const user = authUser.users.find(u => u.email === email);
        if (user) {
            userId = user.id;
            console.log(`Found in auth.users. ID: ${userId}`);
        }
    }
  }

  if (!userId) {
      console.log(`User ${email} not found.`);
      return;
  }

  // 2. Get wallet balance
  const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
  if (wallet) {
      console.log(`Wallet Balance: ${wallet.balance_credits}`);
  } else {
      console.log(`No wallet found for user.`);
  }

  // 3. Get recent transactions to see if they ran out
  const { data: tx } = await supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
  console.log(`Recent transactions:`, tx?.map(t => ({ amount: t.amount, feature: t.feature, status: t.status, date: t.created_at })));

  // 4. Get recent image_jobs for this user
  const { data: jobs } = await supabase.from('image_jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(3);
  console.log(`Recent image_jobs:`, jobs?.map(j => ({ id: j.id, status: j.status, error: j.error_message, date: j.created_at })));

}

run().catch(console.error);
