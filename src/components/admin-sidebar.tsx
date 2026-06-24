"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { LayoutDashboard, Users, Server, FileText, Settings, Video } from "lucide-react"

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Providers", href: "/admin/providers", icon: Server },
  { name: "Templates", href: "/admin/templates", icon: FileText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white/80 backdrop-blur-md transition-transform dark:bg-slate-950/80">
      <div className="flex h-full flex-col px-3 py-4">
        <div className="mb-6 px-3 flex items-center space-x-2">
          <Video className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold tracking-tight">TaoVideo</span>
          <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">Admin</span>
        </div>
        <ul className="space-y-2 font-medium flex-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`relative flex items-center rounded-lg p-2 text-slate-900 transition-colors dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 group ${isActive ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-slate-200/50 dark:bg-slate-800/50"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={`relative z-10 h-5 w-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white'}`} />
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
