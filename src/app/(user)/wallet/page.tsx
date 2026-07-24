import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/auth-service";
import { WalletClientPage } from "./wallet-client";

export default async function UserWalletPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return <div>Please log in to view your wallet.</div>;
  }

  // 1. Fetch Wallet
  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  console.log("=== WALLET DEBUG ===", {
    authUserId: user.id,
    authEmail: user.email,
    walletUserId: wallet?.user_id,
    balance: wallet?.balance_credits,
    error,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    projectRef: process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]
  });

  // 2. Fetch Packages
  const { data: packages } = await supabase
    .from("credit_packages")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // 3. Fetch Transactions
  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <WalletClientPage 
      wallet={wallet || {}} 
      packages={packages || []} 
      transactions={transactions || []} 
    />
  );
}

