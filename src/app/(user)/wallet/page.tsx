import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/auth-service";
import { WalletClientPage } from "./wallet-client";

export default async function UserWalletPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return <div>Please log in to view your wallet.</div>;
  }

  // Process searchParams safely (Next.js 15 compatible if awaited)
  const sp = await (searchParams || {});
  const startDateParam = typeof sp.startDate === 'string' ? sp.startDate : undefined;
  const endDateParam = typeof sp.endDate === 'string' ? sp.endDate : undefined;

  // Calculate Date bounds for Asia/Ho_Chi_Minh (UTC+7)
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  
  let endVn = new Date(vnTime);
  let startVn = new Date(vnTime);
  startVn.setUTCDate(startVn.getUTCDate() - 6); // Last 7 days including today
  
  if (startDateParam && endDateParam) {
    const s = new Date(startDateParam);
    const e = new Date(endDateParam);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s.getTime() <= e.getTime()) {
       startVn = s;
       endVn = e;
    }
  }

  // Normalize to 00:00:00 local representation
  startVn.setUTCHours(0, 0, 0, 0);
  const exclusiveEndVn = new Date(endVn);
  exclusiveEndVn.setUTCDate(exclusiveEndVn.getUTCDate() + 1);
  exclusiveEndVn.setUTCHours(0, 0, 0, 0);

  // Convert to actual UTC for DB query (subtract 7 hours)
  const startUtc = new Date(startVn.getTime() - 7 * 60 * 60 * 1000);
  const endUtc = new Date(exclusiveEndVn.getTime() - 7 * 60 * 60 * 1000);

  // 1. Fetch Wallet
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // 2. Fetch User Profile for Plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("image_tier")
    .eq("id", user.id)
    .single();

  // 3. Fetch Packages
  const { data: packages } = await supabase
    .from("credit_packages")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // 4. Fetch Transactions for History (Filtered by date, max 100 for safety)
  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", startUtc.toISOString())
    .lt("created_at", endUtc.toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <WalletClientPage 
      wallet={wallet || {}} 
      packages={packages || []} 
      transactions={transactions || []} 
      userPlan={profile?.image_tier || "FREE"}
      initialStartDate={startVn.toISOString().split('T')[0]}
      initialEndDate={endVn.toISOString().split('T')[0]}
    />
  );
}


