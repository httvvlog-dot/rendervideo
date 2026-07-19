"use client";

import { useState } from "react";
import { CreditCard, Wallet, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserWalletPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleMockCheckout = async () => {
    setIsProcessing(true);
    // In reality, this would hit an API to create an order -> Stripe -> Webhook -> Wallet
    await new Promise(r => setTimeout(r, 2000));
    setIsProcessing(false);
    alert("Mock Payment Successful! Credits added to your wallet.");
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
            <div className="text-4xl font-bold text-white">0</div>
            <p className="text-sm text-emerald-400 mt-2">+0 Bonus Credits</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-6">Buy Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mock Packages */}
          {[
            { name: "Starter", credits: 1000, price: "100.000đ", bonus: 0 },
            { name: "Standard", credits: 3000, price: "300.000đ", bonus: 300, recommended: true },
            { name: "Pro", credits: 5000, price: "500.000đ", bonus: 800 }
          ].map(pkg => (
            <div key={pkg.name} className={`bg-slate-900 border rounded-xl p-6 relative flex flex-col ${pkg.recommended ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-slate-800'}`}>
              {pkg.recommended && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl flex items-center">
                  <Star className="w-3 h-3 mr-1 fill-white" /> Recommended
                </div>
              )}
              <h3 className="text-lg font-bold text-slate-200">{pkg.name}</h3>
              <div className="mt-4 mb-2">
                <span className="text-3xl font-bold text-white">{pkg.credits}</span>
                <span className="text-slate-500 ml-2">Credits</span>
              </div>
              {pkg.bonus > 0 ? (
                <p className="text-emerald-400 text-sm font-medium mb-6">+{pkg.bonus} Bonus Credits</p>
              ) : (
                <p className="text-slate-500 text-sm mb-6">No Bonus</p>
              )}
              <Button 
                onClick={handleMockCheckout} 
                disabled={isProcessing}
                className={`mt-auto w-full ${pkg.recommended ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
              >
                {isProcessing ? "Processing..." : `Buy for ${pkg.price}`}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
