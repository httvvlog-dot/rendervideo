"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, Wallet, FileText, Package, Bot, CreditCard, 
  DollarSign, Activity, Users, TrendingUp, Download, Plus, RefreshCw, Clock
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function BillingTabsClient({ analytics, wallets, rules, transactions, reservations = [] }: { analytics: any, wallets: any[], rules: any[], transactions: any[], reservations?: any[] }) {
  
  const handleReleaseReservation = async (txId: string) => {
    if (!confirm("Are you sure you want to manually release this reservation?")) return;
    const supabase = createClient();
    const { error } = await supabase.rpc('release_credits', {
      p_transaction_id: txId,
      p_reason: 'Released manually by Admin'
    });
    if (error) alert("Error releasing reservation: " + error.message);
    else alert("Reservation released successfully! Please refresh.");
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
            Commercial Billing
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage wallets, AI pricing, credit packages and payment analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-white dark:bg-slate-900 shadow-sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400">
            <Plus className="w-4 h-4 mr-2" />
            Create Package
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Grant Credits
          </Button>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 p-1 rounded-lg flex space-x-1 overflow-x-auto w-full justify-start h-auto">
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md px-4 py-2 flex items-center gap-2 transition-all">
            <BarChart3 className="w-4 h-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="wallets" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md px-4 py-2 flex items-center gap-2 transition-all">
            <Wallet className="w-4 h-4" /> Wallets
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md px-4 py-2 flex items-center gap-2 transition-all">
            <FileText className="w-4 h-4" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="reservations" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md px-4 py-2 flex items-center gap-2 transition-all">
            <Clock className="w-4 h-4" /> Reservations
          </TabsTrigger>
          <TabsTrigger value="packages" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md px-4 py-2 flex items-center gap-2 transition-all">
            <Package className="w-4 h-4" /> Packages
          </TabsTrigger>
          <TabsTrigger value="pricing" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md px-4 py-2 flex items-center gap-2 transition-all">
            <Bot className="w-4 h-4" /> AI Pricing
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md px-4 py-2 flex items-center gap-2 transition-all">
            <CreditCard className="w-4 h-4" /> Payment Orders
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="analytics" className="space-y-6 m-0 focus:outline-none">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard title="Revenue" value={`${analytics.revenue.toLocaleString()} ₫`} icon={<DollarSign className="w-4 h-4 text-emerald-500" />} />
              <MetricCard title="Gross Profit" value={`${analytics.grossProfit.toLocaleString()} ₫`} icon={<TrendingUp className="w-4 h-4 text-emerald-600" />} />
              <MetricCard title="API Cost" value={`$${analytics.apiCost.toFixed(4)}`} icon={<Activity className="w-4 h-4 text-rose-500" />} />
              <MetricCard title="Credits Sold" value={analytics.creditsSold.toLocaleString()} icon={<Package className="w-4 h-4 text-indigo-500" />} />
              <MetricCard title="Credits Used" value={analytics.creditsConsumed.toLocaleString()} icon={<BarChart3 className="w-4 h-4 text-blue-500" />} />
              <MetricCard title="Outstanding Credits" value={analytics.outstandingCredits.toLocaleString()} icon={<Wallet className="w-4 h-4 text-amber-500" />} />
              <MetricCard title="Active Wallets" value={analytics.walletsCount.toLocaleString()} icon={<Users className="w-4 h-4 text-purple-500" />} />
              <MetricCard title="Pending Orders" value={analytics.pendingOrders.toLocaleString()} icon={<CreditCard className="w-4 h-4 text-orange-500" />} />
            </div>

            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Historical API Cost</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {analytics.apiCost === 0 ? "Unavailable before Billing V3. Status: Not Calculated" : "Run backfill to estimate costs for old generations."}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                fetch("/api/admin/backfill", { method: "POST" })
                  .then(() => alert("Backfill background job started."))
                  .catch(e => alert("Error starting backfill: " + e.message));
              }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Backfill
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="wallets" className="m-0 focus:outline-none">
            <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">User Email</th>
                    <th className="px-6 py-4 font-medium">Current Balance</th>
                    <th className="px-6 py-4 font-medium">Lifetime Used</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {wallets.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Users className="h-10 w-10 mb-3 text-slate-300 dark:text-slate-700" />
                          <p className="text-slate-600 dark:text-slate-400 font-medium">No wallets found</p>
                          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Users will appear here once they receive or spend credits.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    wallets.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{w.auth?.users?.email || w.user_id}</td>
                        <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-bold">{w.balance_credits?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{w.total_consumed_credits?.toLocaleString() || w.lifetime_used?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors mr-3">Edit</button>
                          <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors">Buckets</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="m-0 focus:outline-none">
            <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Feature</th>
                    <th className="px-6 py-4 font-medium">Provider / Model</th>
                    <th className="px-6 py-4 font-medium">User Charge</th>
                    <th className="px-6 py-4 font-medium">API Cost</th>
                    <th className="px-6 py-4 font-medium">Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Bot className="h-10 w-10 mb-3 text-slate-300 dark:text-slate-700" />
                          <p className="text-slate-600 dark:text-slate-400 font-medium">No pricing rules configured</p>
                          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 mb-4">You need to set up credit costs for AI features.</p>
                          <Button variant="outline" size="sm">Add Rule</Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rules.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          {r.feature}
                        </td>
                        <td className="px-6 py-4">{r.provider_model_pricing?.provider} / <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{r.provider_model_pricing?.model}</span></td>
                        <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-bold">{r.credit_cost} Credits</td>
                        <td className="px-6 py-4 text-rose-600 dark:text-rose-400 font-medium">${Number(r.provider_model_pricing?.api_cost).toFixed(4)}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono">v{r.version}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="m-0 focus:outline-none">
            <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">User Email</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <FileText className="h-10 w-10 mb-3 text-slate-300 dark:text-slate-700" />
                          <p className="text-slate-600 dark:text-slate-400 font-medium">No transactions found</p>
                          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">When users consume credits, they will appear here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{t.auth?.users?.email || t.user_id}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                            ${t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 
                              t.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 
                              'bg-rose-100 text-rose-800'}`}>
                            {t.status || 'COMPLETED'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800`}>
                            {t.transaction_type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 font-bold ${t.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600">{t.balance_after?.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="reservations" className="m-0 focus:outline-none">
            <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-medium">Created</th>
                    <th className="px-6 py-4 font-medium">User Email</th>
                    <th className="px-6 py-4 font-medium">Credits</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Timeout</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {reservations.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Clock className="h-10 w-10 mb-3 text-slate-300 dark:text-slate-700" />
                          <p className="text-slate-600 dark:text-slate-400 font-medium">No active reservations</p>
                          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Pending AI generations will appear here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reservations.map(r => {
                      const isExpired = new Date(r.expires_at) < new Date();
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{r.wallets?.auth?.users?.email || r.wallet_id}</td>
                          <td className="px-6 py-4 font-bold text-amber-600">{r.reserved_amount.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                              ${r.status === 'ACTIVE' ? (isExpired ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800') : 
                                r.status === 'COMMITTED' ? 'bg-emerald-100 text-emerald-800' : 
                                'bg-slate-100 text-slate-800'}`}>
                              {r.status === 'ACTIVE' && isExpired ? 'EXPIRED' : r.status}
                            </span>
                          </td>
                          <td className={`px-6 py-4 font-mono text-xs ${isExpired ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                            {new Date(r.expires_at).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {r.status === 'ACTIVE' && (
                              <button onClick={() => handleReleaseReservation(r.wallet_transaction_id)} className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors">
                                Release
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="packages" className="m-0 focus:outline-none">
            <PlaceholderTab 
              icon={<Package className="h-10 w-10 mb-3 text-slate-300 dark:text-slate-700" />}
              title="Credit Packages"
              description="Configure the price, credits, and bonus credits for user packages."
            />
          </TabsContent>

          <TabsContent value="orders" className="m-0 focus:outline-none">
            <PlaceholderTab 
              icon={<CreditCard className="h-10 w-10 mb-3 text-slate-300 dark:text-slate-700" />}
              title="Payment Orders"
              description="View real-world payment transactions and Stripe webhooks."
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="bg-white dark:bg-[#1b2742] border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
      </CardContent>
    </Card>
  )
}

function PlaceholderTab({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
      {icon}
      <p className="text-slate-700 dark:text-slate-300 font-medium text-lg">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-500 mt-2 mb-4 text-center max-w-sm">
        {description}
      </p>
      <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs px-3 py-1 rounded-full font-semibold">
        Coming in Sprint 6
      </span>
    </div>
  )
}


