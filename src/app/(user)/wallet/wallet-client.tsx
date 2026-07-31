"use client";

import { useState } from "react";
import { CreditCard, Wallet, Star, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WalletClientPage({ 
  wallet, 
  packages, 
  transactions,
  userPlan
}: { 
  wallet: any, 
  packages: any[], 
  transactions: any[],
  userPlan: string
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleCheckout = async (pkgId: string) => {
    setIsProcessing(true);
    // Real checkout flow goes here
    await new Promise(r => setTimeout(r, 1000));
    setIsProcessing(false);
    alert(`Mock Payment Triggered for Package ${pkgId}! In real implementation this redirects to the payment gateway.`);
  };

  const balance = wallet.balance_credits || 0;
  const lifetimeUsage = wallet.total_consumed_credits || wallet.lifetime_used || 0;

  // Helpers
  const getFeatureIcon = (feature: string) => {
    if (feature === "VIDEO_RENDER") return "🎬 Render Video";
    if (feature === "VOICE_GENERATION") return "🎤 Generate Voice";
    if (feature === "SCRIPT_GENERATION") return "📝 Generate Script";
    if (feature === "IMAGE_GENERATION") return "🖼 Generate Image";
    if (feature === "TOP_UP" || !feature) return "📥 Buy Credits";
    return feature;
  };
  
  const getStatusColor = (status: string) => {
    if (status === "RESERVED" || status === "PENDING") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (status === "REFUNDED" || status === "ROLLBACK") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    if (status === "COMPLETED") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Wallet & Credits</h1>
        <p className="text-slate-400 mt-2">Manage your balance and upgrade your plan.</p>
      </div>

      {/* 1. Wallet Summary */}
      <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center text-indigo-300 mb-2 font-medium">
              <Wallet className="w-5 h-5 mr-2" />
              Available AI Credits
            </div>
            <div className="text-5xl font-extrabold text-white">{balance.toLocaleString()}</div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex-1 md:w-40 backdrop-blur-sm">
              <div className="text-slate-400 text-sm mb-1 flex items-center gap-1.5"><Zap className="w-4 h-4" /> Current Plan</div>
              <div className="text-lg font-bold text-white">{userPlan}</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex-1 md:w-40 backdrop-blur-sm">
              <div className="text-slate-400 text-sm mb-1 flex items-center gap-1.5"><FileText className="w-4 h-4" /> Total Credits Used</div>
              <div className="text-lg font-bold text-white">{lifetimeUsage.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Buy Credits */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-400" /> Buy Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.length === 0 ? (
            <div className="col-span-3 text-slate-500 py-10 text-center border border-slate-800 rounded-xl border-dashed">
              No active credit packages available.
            </div>
          ) : (
            packages.map(pkg => (
              <div key={pkg.id} className={`bg-slate-900 border rounded-2xl p-6 relative flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl ${pkg.is_featured ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-slate-800'}`}>
                {pkg.is_featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-md whitespace-nowrap">
                    <Star className="w-3 h-3 mr-1 fill-white" /> POPULAR
                  </div>
                )}
                {pkg.bonus_credits > 20 && !pkg.is_featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-md whitespace-nowrap">
                    🔥 BEST VALUE
                  </div>
                )}
                
                <div className="text-center mt-4 mb-4">
                  <h3 className="text-slate-400 font-medium mb-1">{pkg.name}</h3>
                  <div className="text-3xl font-bold text-white">{(pkg.price_vnd / 1000).toLocaleString()}k ₫</div>
                </div>
                
                <div className="bg-slate-950 rounded-xl p-4 mb-4 text-center border border-slate-800/50">
                  <div className="text-2xl font-bold text-indigo-400">{pkg.credits?.toLocaleString()} <span className="text-sm font-normal text-slate-400">Credits</span></div>
                  {pkg.bonus_credits > 0 ? (
                    <div className="text-emerald-400 text-xs font-medium mt-1">🎁 +{pkg.bonus_credits?.toLocaleString()} Bonus</div>
                  ) : (
                    <div className="text-slate-500 text-xs mt-1">Standard rate</div>
                  )}
                </div>
                
                <div className="mt-auto pt-2">
                  <Button 
                    size="sm"
                    onClick={() => handleCheckout(pkg.id)} 
                    disabled={isProcessing}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm h-10 border border-slate-700"
                  >
                    Payment Coming Soon
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Transaction History */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 mt-8"><FileText className="w-5 h-5 text-indigo-400" /> Transaction History</h2>
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Credits</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-10 w-10 mb-3 text-slate-700" />
                      <p className="text-slate-400 font-medium">No transactions yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">
                      {getFeatureIcon(t.feature)}
                      {t.transaction_type === "REFUND" && <span className="ml-2 text-xs text-purple-400">(Refund)</span>}
                    </td>
                    <td className={`px-6 py-4 font-bold whitespace-nowrap ${t.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 border rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(t.status || t.transaction_type)}`}>
                        {t.status || t.transaction_type}
                      </span>
                    </td>
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

