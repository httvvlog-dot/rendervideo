"use client";

import { useState } from "react";
import { CreditCard, Wallet, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WalletClientPage({ wallet, packages, transactions }: { wallet: any, packages: any[], transactions: any[] }) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleCheckout = async (pkgId: string) => {
    setIsProcessing(true);
    // Real checkout flow goes here
    await new Promise(r => setTimeout(r, 1000));
    setIsProcessing(false);
    alert("Mock Payment Triggered! In real implementation this redirects to Stripe.");
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">My Wallet</h1>
        <p className="text-slate-400 mt-2">Manage your credits and view your usage history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center text-slate-400 mb-2">
              <Wallet className="w-5 h-5 mr-2" />
              <span>Current Balance</span>
            </div>
            <div className="text-4xl font-bold text-white">{wallet.balance_credits?.toLocaleString() || 0}</div>
            <p className="text-sm text-emerald-400 mt-2">Life-time Used: {wallet.total_consumed_credits?.toLocaleString() || wallet.lifetime_used?.toLocaleString() || 0}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-6">Buy Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.length === 0 ? (
            <div className="col-span-3 text-slate-500 py-10 text-center border border-slate-800 rounded-xl border-dashed">
              No active credit packages available.
            </div>
          ) : (
            packages.map(pkg => (
              <div key={pkg.id} className={`bg-slate-900 border rounded-xl p-6 relative flex flex-col ${pkg.is_featured ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-slate-800'}`}>
                {pkg.is_featured && (
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl flex items-center">
                    <Star className="w-3 h-3 mr-1 fill-white" /> Recommended
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-200">{pkg.name}</h3>
                <div className="mt-4 mb-2">
                  <span className="text-3xl font-bold text-white">{pkg.credits?.toLocaleString()}</span>
                  <span className="text-slate-500 ml-2">Credits</span>
                </div>
                {pkg.bonus_credits > 0 ? (
                  <p className="text-emerald-400 text-sm font-medium mb-6">+{pkg.bonus_credits?.toLocaleString()} Bonus Credits</p>
                ) : (
                  <p className="text-slate-500 text-sm mb-6">No Bonus</p>
                )}
                <Button 
                  onClick={() => handleCheckout(pkg.id)} 
                  disabled={isProcessing}
                  className={`mt-auto w-full ${pkg.is_featured ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                >
                  {isProcessing ? "Processing..." : `Buy for ${(pkg.price_vnd / 1000).toLocaleString()}k ₫`}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-6 mt-12">Transaction History</h2>
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Feature</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-10 w-10 mb-3 text-slate-700" />
                      <p className="text-slate-400 font-medium">No transactions yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.amount < 0 ? 'bg-rose-900/50 text-rose-400' : 'bg-emerald-900/50 text-emerald-400'}`}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">{t.feature || '-'}</td>
                    <td className={`px-6 py-4 font-bold ${t.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-400">{t.balance_after?.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
