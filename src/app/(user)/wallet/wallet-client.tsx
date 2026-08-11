"use client";

import { useState } from "react";
import { CreditCard, Wallet, Star, FileText, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const CREDIT_TO_VND = 1000;

export function WalletClientPage({ 
  wallet, 
  packages, 
  transactions,
  userPlan,
  initialStartDate,
  initialEndDate
}: { 
  wallet: any, 
  packages: any[], 
  transactions: any[],
  userPlan: string,
  initialStartDate?: string,
  initialEndDate?: string
}) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [startDate, setStartDate] = useState(initialStartDate || "");
  const [endDate, setEndDate] = useState(initialEndDate || "");

  const handleFilter = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      alert("Ngày bắt đầu không được lớn hơn ngày kết thúc");
      return;
    }
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    router.push(`/wallet?${params.toString()}`);
  };
  
  const handleCheckout = async (pkgId: string) => {
    setIsProcessing(true);
    // Real checkout flow goes here
    await new Promise(r => setTimeout(r, 1000));
    setIsProcessing(false);
    alert(`Mock Payment Triggered for Package ${pkgId}! In real implementation this redirects to the payment gateway.`);
  };

  const balance = wallet.balance_credits || 0;
  const balanceVnd = balance * CREDIT_TO_VND;
  const lifetimeUsage = wallet.total_consumed_credits || wallet.lifetime_used || 0;
  const bonusCredits = wallet.total_bonus_credits || wallet.lifetime_bonus || 0;

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

  const scrollToBuyCredits = () => {
    const buySection = document.getElementById("buy-credits-section");
    if (buySection) {
      buySection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Wallet & Credits</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your balance and upgrade your plan.</p>
      </div>

      {/* 1. Wallet Summary */}
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-purple-500 via-violet-500 to-cyan-400 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
        <div className="bg-slate-950 rounded-[15px] p-5 sm:p-8 relative overflow-hidden h-full w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-slate-900 pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 sm:gap-6">
          <div>
            <div className="flex items-center text-indigo-300 mb-1.5 sm:mb-2 font-medium text-sm sm:text-base">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
              AI Wallet Balance
            </div>
            <div className="flex items-baseline gap-2 sm:gap-3">
              <div className="text-4xl sm:text-5xl font-extrabold text-white">{balance.toLocaleString()}</div>
              <div className="text-lg sm:text-xl font-medium text-indigo-300/80">≈ {balanceVnd.toLocaleString('vi-VN')} VNĐ</div>
            </div>
            <Button 
              onClick={scrollToBuyCredits}
              className="mt-3 sm:mt-4 h-9 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 sm:px-6 shadow-lg shadow-indigo-500/20 border-0 active:scale-[0.98] transition-all duration-200"
            >
              + Buy Credits
            </Button>
          </div>
          
          <div className="flex gap-3 sm:gap-4 w-full md:w-auto mt-2 md:mt-0">
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 sm:p-4 flex-1 md:w-32 backdrop-blur-md shadow-inner flex flex-col justify-center">
              <div className="text-slate-400 text-xs sm:text-sm mb-1 flex items-center gap-1.5"><Zap className="w-[14px] h-[14px] sm:w-4 sm:h-4 text-purple-400" /> Current Plan</div>
              <div className="text-base sm:text-lg font-bold text-white leading-none">{userPlan}</div>
            </div>
            {bonusCredits > 0 && (
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 sm:p-4 flex-1 md:w-32 backdrop-blur-md shadow-inner flex flex-col justify-center">
                <div className="text-slate-400 text-xs sm:text-sm mb-1 flex items-center gap-1.5"><Star className="w-[14px] h-[14px] sm:w-4 sm:h-4 text-amber-400" /> Bonus</div>
                <div className="text-base sm:text-lg font-bold text-white leading-none">{bonusCredits.toLocaleString()}</div>
              </div>
            )}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 sm:p-4 flex-1 md:w-32 backdrop-blur-md shadow-inner flex flex-col justify-center">
              <div className="text-slate-400 text-xs sm:text-sm mb-1 flex items-center gap-1.5"><FileText className="w-[14px] h-[14px] sm:w-4 sm:h-4 text-cyan-400" /> Total Used</div>
              <div className="text-base sm:text-lg font-bold text-white leading-none">{lifetimeUsage.toLocaleString()}</div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* 2. Buy Credits */}
      <div id="buy-credits-section">
        <div className="mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white"><CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Buy Credits</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">1 Credit = 1.000 VNĐ</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.length === 0 ? (
            <div className="col-span-1 md:col-span-3 flex flex-col items-center justify-center h-32 sm:h-40 border border-slate-200 dark:border-slate-800 rounded-xl border-dashed bg-slate-50 dark:bg-slate-900/30">
              <CreditCard className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-500 dark:text-indigo-400 mb-2 opacity-40" />
              <div className="text-slate-500 font-medium text-sm">No active credit packages available.</div>
            </div>
          ) : (
            packages.map(pkg => (
              <div key={pkg.id} className={`group relative rounded-2xl transition-all hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] border bg-white dark:bg-transparent ${pkg.is_featured ? 'border-indigo-500 shadow-lg shadow-indigo-500/10 dark:shadow-indigo-500/20 hover:border-transparent' : 'border-slate-200 dark:border-slate-800 hover:border-transparent'}`}>
                {/* Hover Gradient Border Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-violet-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none p-[1px] z-0">
                  <div className="bg-white dark:bg-slate-900 w-full h-full rounded-[15px]"></div>
                </div>
                
                <div className="relative z-10 flex flex-col h-full p-6">
                  {pkg.is_featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-md whitespace-nowrap z-20">
                      <Star className="w-3 h-3 mr-1 fill-white" /> POPULAR
                    </div>
                  )}
                  {pkg.bonus_credits > 20 && !pkg.is_featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-md whitespace-nowrap z-20">
                      🔥 BEST VALUE
                    </div>
                  )}
                  
                  <div className="text-center mt-4 mb-4">
                    <h3 className="text-slate-500 dark:text-slate-400 font-medium mb-1">{pkg.name}</h3>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">{pkg.price_vnd.toLocaleString('vi-VN')} VNĐ</div>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 mb-4 text-center border border-slate-200 dark:border-slate-800/50">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{pkg.credits?.toLocaleString()} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">Credits</span></div>
                    {pkg.bonus_credits > 0 ? (
                      <div className="text-emerald-600 dark:text-emerald-400 text-xs font-medium mt-1">🎁 +{pkg.bonus_credits?.toLocaleString()} Bonus</div>
                    ) : (
                      <div className="text-slate-500 text-xs mt-1">Standard rate</div>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-2">
                    <Button 
                      size="sm"
                      onClick={() => handleCheckout(pkg.id)} 
                      disabled={isProcessing}
                      className="w-full bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm h-10 border border-slate-200 dark:border-slate-700/50 opacity-70 cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    >
                      Coming Soon
                    </Button>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2 font-medium tracking-wide">
                      QR • MoMo • VNPay • Stripe
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Transaction History */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 mt-8">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Transaction History
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500"
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500"
            />
            <Button onClick={handleFilter} size="sm" variant="secondary" className="px-3 h-9" title="Lọc">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap min-w-[500px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Credits / VNĐ</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="h-10 w-10 mb-3 text-indigo-400 opacity-50" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No transactions yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 align-top pt-5">
                        {new Date(t.created_at).toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 align-top pt-5">
                        {getFeatureIcon(t.feature)}
                        {t.transaction_type === "REFUND" && <span className="ml-2 text-xs text-purple-500 dark:text-purple-400">(Refund)</span>}
                      </td>
                      <td className={`px-6 py-4 font-bold align-top ${t.amount < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                        <div>{t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()} Credits</div>
                        <div className="text-xs font-medium opacity-70 mt-1">≈ {t.amount > 0 ? '+' : ''}{Math.abs(t.amount * CREDIT_TO_VND).toLocaleString('vi-VN')} VNĐ</div>
                      </td>
                      <td className="px-6 py-4 align-top pt-5">
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

          {/* Mobile List */}
          <div className="sm:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800/80">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 mb-3 text-indigo-400 opacity-50" />
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No transactions yet</p>
              </div>
            ) : (
              transactions.map(t => (
                <div key={t.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm flex-1">
                      {getFeatureIcon(t.feature)}
                      {t.transaction_type === "REFUND" && <span className="ml-1 text-xs text-purple-500 dark:text-purple-400">(Refund)</span>}
                    </div>
                    <div className={`font-bold text-right text-sm ${t.amount < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                      <div>{t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()} Cr</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="font-mono text-xs text-slate-500">
                      {new Date(t.created_at).toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusColor(t.status || t.transaction_type)}`}>
                      {t.status || t.transaction_type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

