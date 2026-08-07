import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = '1d159c39-8939-4668-b019-e9d8778c05a7';
  
  async function fetchLedgerState(label) {
    console.log(`\n=== ${label} ===`);
    const { data: wallet } = await supabase.from('wallets').select('balance_credits, reserved_credits').eq('user_id', userId).single();
    const { data: activeRes } = await supabase.from('wallet_reservations').select('reserved_amount, status').eq('status', 'ACTIVE');
    const { data: pendingTx } = await supabase.from('wallet_transactions').select('id, status').eq('user_id', userId).eq('status', 'PENDING');
    
    // Sum only this user's reservations by looking up their wallet_id
    const { data: myWallet } = await supabase.from('wallets').select('id').eq('user_id', userId).single();
    let sumActive = 0;
    if (myWallet) {
        // Need to query reservations by wallet_id, but reservations don't have user_id, they have bucket_id.
        // Let's just sum all active reservations that belong to this user's transactions.
        const { data: myActiveRes } = await supabase.from('wallet_reservations')
            .select('reserved_amount')
            .eq('status', 'ACTIVE'); // wait, wallet_reservations doesn't have user_id directly.
            
        // We'll calculate SUM(active reservations) globally or just for the ones belonging to the PENDING transactions.
        // Actually, let's just query transactions.
    }
    
    console.log(`balance_credits:`, wallet?.balance_credits);
    console.log(`reserved_credits:`, wallet?.reserved_credits);
    console.log(`available_credits:`, wallet ? wallet.balance_credits - wallet.reserved_credits : 0);
    console.log(`pending stale transactions:`, pendingTx?.length || 0);
    
    // We can join wallet_reservations to transactions to get the user's reservations
    const { data: userActiveRes } = await supabase.from('wallet_reservations')
      .select('reserved_amount, wallet_transaction_id')
      .eq('status', 'ACTIVE')
      .in('wallet_transaction_id', pendingTx?.map(tx => tx.id) || []);
      
    console.log(`active reservations (user):`, userActiveRes?.length || 0);
    const sumActiveUser = userActiveRes?.reduce((acc, r) => acc + r.reserved_amount, 0) || 0;
    console.log(`SUM(active reservations):`, sumActiveUser);
  }

  await fetchLedgerState("BEFORE REPAIR");

  console.log("\nExecuting release_expired_reservations()...");
  const { data: releasedCount, error } = await supabase.rpc('release_expired_reservations');
  
  console.log("release_expired_reservations executed: YES");
  console.log("Error:", error);
  console.log("Returned count:", releasedCount);

  await fetchLedgerState("AFTER REPAIR");
}

run();
