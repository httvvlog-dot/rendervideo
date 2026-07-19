import { ReactNode } from "react";
import Link from "next/link";
import { Wallet, Receipt, Package, DollarSign, Activity, CreditCard } from "lucide-react";

export default function BillingLayout({ children }: { children: ReactNode }) {
  const tabs = [
    { name: "Analytics", href: "/admin/billing", icon: Activity },
    { name: "Wallets", href: "/admin/billing/wallets", icon: Wallet },
    { name: "Transactions", href: "/admin/billing/transactions", icon: Receipt },
    { name: "Packages", href: "/admin/billing/packages", icon: Package },
    { name: "AI Pricing", href: "/admin/billing/pricing", icon: DollarSign },
    { name: "Payment Orders", href: "/admin/billing/orders", icon: CreditCard },
  ];

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-950 text-slate-200">
      <div className="border-b border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Commercial Billing</h1>
        <div className="flex space-x-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className="flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-white whitespace-nowrap transition-colors"
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="p-6 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
