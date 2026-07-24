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
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single();

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

