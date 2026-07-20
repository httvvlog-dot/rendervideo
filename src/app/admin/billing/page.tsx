import { createClient } from "@/utils/supabase/server";
import { BillingTabsClient } from "./components/billing-tabs-client";

export const dynamic = "force-dynamic";

export default async function BillingDashboardPage() {
  const supabase = await createClient();

  // 1. Fetch Wallets
  const { count: walletsCount, data: wallets } = await supabase
    .from("wallets")
    .select("*, auth.users(email)", { count: "exact" })
    .limit(50);

  // 2. Fetch Usage & Revenue
  const { data: orders } = await supabase.from("payment_orders").select("amount_vnd").eq("status", "SUCCESS");
  const revenue = (orders || []).reduce((acc, o) => acc + Number(o.amount_vnd), 0);
  const pendingOrders = (orders || []).length; // Mock pending orders logic if needed

  const { data: providerLogs } = await supabase.from("provider_cost_logs").select("usd_cost");
  const apiCost = (providerLogs || []).reduce((acc, l) => acc + Number(l.usd_cost), 0);
  
  const creditsConsumed = (wallets || []).reduce((acc, w) => acc + Number(w.total_consumed_credits), 0);
  
  const creditsSold = (wallets || []).reduce((acc, w) => acc + Number(w.total_purchased_credits), 0);
  const outstandingCredits = (wallets || []).reduce((acc, w) => acc + Number(w.balance_credits), 0);
  
  const grossProfit = revenue - (apiCost * 25400); // Rough USD to VND conversion for profit display

  // 3. Fetch Pricing Rules
  const { data: rules } = await supabase
    .from("credit_rules")
    .select("*, provider_model_pricing(*)")
    .order("created_at", { ascending: false });

  // 4. Fetch Transactions Ledger
  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select("*, auth.users(email)")
    .order("created_at", { ascending: false })
    .limit(100);

  // 5. Fetch Reservations
  const { data: reservations } = await supabase
    .from("wallet_reservations")
    .select("*, wallet_transactions(user_id, feature, description), wallets(user_id, auth.users(email))")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="h-full flex flex-col space-y-6">
      <BillingTabsClient 
        analytics={{
          revenue,
          grossProfit,
          apiCost,
          creditsSold,
          creditsConsumed,
          outstandingCredits,
          walletsCount: walletsCount || 0,
          pendingOrders
        }}
        wallets={wallets || []}
        rules={rules || []}
        transactions={transactions || []}
        reservations={reservations || []}
      />
    </div>
  );
}
