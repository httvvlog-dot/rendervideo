"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FolderKanban, Wallet } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

const navItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Wallet", href: "/wallet", icon: Wallet },
]

export function UserBottomNav() {
  const pathname = usePathname()
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    async function loadWallet() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('wallets').select('balance_credits').eq('user_id', user.id).single()
        if (data) setCredits(data.balance_credits)
      }
    }
    loadWallet()
  }, [])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:bg-slate-950/80 lg:hidden">
      <ul className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard")
          
          return (
            <li key={item.name} className="flex-1">
              <Link
                href={item.href}
                className="group flex flex-col items-center justify-center space-y-1 py-1 min-h-[44px]"
              >
                <div className="relative">
                  <div 
                    className={`flex h-8 w-16 items-center justify-center rounded-full transition-all duration-200 ${
                      isActive 
                        ? "bg-indigo-100 text-indigo-600 scale-105 dark:bg-indigo-900/50 dark:text-indigo-400" 
                        : "text-slate-500 group-hover:bg-slate-100 dark:text-slate-400 dark:group-hover:bg-slate-800"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? "" : "group-hover:text-slate-900 dark:group-hover:text-white"}`} />
                  </div>
                  
                  {/* Badge logic for Wallet */}
                  {item.name === "Wallet" && credits !== null && credits < 20 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950">
                      {credits}
                    </span>
                  )}
                </div>
                <span 
                  className={`text-[11px] font-medium transition-colors ${
                    isActive 
                      ? "text-indigo-600 dark:text-indigo-400" 
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

