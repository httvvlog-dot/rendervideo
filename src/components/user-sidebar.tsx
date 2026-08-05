"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { LayoutDashboard, FolderKanban, Wallet } from "lucide-react"
import { HataraLogo } from "@/components/hatara-logo"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Projects", href: "/projects", icon: FolderKanban },
  { name: "Wallet & Credits", href: "/wallet", icon: Wallet },
]

export function UserSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white/80 backdrop-blur-md transition-transform dark:bg-slate-950/80 hidden lg:block">
      <div className="flex h-full flex-col px-3 py-4">
        <div className="mb-6 px-3 flex items-center space-x-2">
          <HataraLogo className="h-6 w-6 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-br from-purple-500 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent">Hatara</span>
              <span className="text-slate-900 dark:text-slate-50 ml-1">Studio</span>
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-none">
              AI Creative Platform
            </span>
          </div>
        </div>
        <ul className="space-y-2 font-medium flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard")
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`relative flex items-center rounded-lg p-2 text-slate-900 transition-colors dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 group ${isActive ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="user-sidebar-active"
                      className="absolute inset-0 rounded-lg bg-indigo-100/50 dark:bg-indigo-900/30"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={`relative z-10 h-5 w-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white'}`} />
                  <span className="relative z-10 ml-3">{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
