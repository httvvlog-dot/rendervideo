import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, DollarSign, Users, CreditCard } from "lucide-react";

export default async function BillingDashboardPage() {
  const supabase = await createClient();

  // Basic stats
  const { count: usersCount } = await supabase.from("wallets").select("*", { count: "exact", head: true });
  const { data: orders } = await supabase.from("payment_orders").select("amount_vnd").eq("status", "SUCCESS");
  const revenue = (orders || []).reduce((acc, o) => acc + Number(o.amount_vnd), 0);

  const { data: usage } = await supabase.from("project_usage").select("api_cost_usd, total_credits");
  const apiCost = (usage || []).reduce((acc, u) => acc + Number(u.api_cost_usd), 0);
  const creditsConsumed = (usage || []).reduce((acc, u) => acc + Number(u.total_credits), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <h2 className="text-xl font-semibold mb-4">Analytics Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{revenue.toLocaleString()} ₫</div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total API Cost</CardTitle>
            <Activity className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400">${apiCost.toFixed(4)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Credits Consumed</CardTitle>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{creditsConsumed.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Wallets</CardTitle>
            <Users className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-400">{usersCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4 text-slate-300">Detailed Cost Breakdown</h3>
        <p className="text-sm text-slate-500">More detailed charts (Top Models, Feature Split) will be populated here as transactions scale.</p>
      </div>
    </div>
  );
}
