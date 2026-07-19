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

  const { data: usage } = await supabase.from("project_usage").select("api_cost_usd, total_credits");
  const apiCost = (usage || []).reduce((acc, u) => acc + Number(u.api_cost_usd), 0);
  const creditsConsumed = (usage || []).reduce((acc, u) => acc + Number(u.total_credits), 0);
  
  const creditsSold = 0; // Placeholder for real packages sold
  const outstandingCredits = 0; // Sum of all wallet balances
  const grossProfit = revenue - (apiCost * 25400); // Rough USD to VND conversion for profit display

  // 3. Fetch Pricing Rules
  const { data: rules } = await supabase
    .from("credit_rules")
    .select("*, provider_model_pricing(*)")
    .order("created_at", { ascending: false });

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
      />
    </div>
  );
}
