"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Server, Settings, FileCode2, Video, ScrollText } from "lucide-react"
import { cn } from "@/lib/utils"

const adminNavItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Providers", href: "/admin/providers", icon: Server },
  { name: "Templates", href: "/admin/templates", icon: FileCode2 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Logs", href: "/admin/logs", icon: ScrollText },
  { name: "System Validation", href: "/admin/system", icon: Server },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white/80 backdrop-blur-md transition-transform dark:bg-slate-950/80">
      <div className="flex h-full flex-col px-3 py-4">
        <div className="mb-6 px-3 flex items-center space-x-2">
          <Video className="h-6 w-6 text-indigo-600" />
          <span className="text-xl font-bold tracking-tight">TaoVideo</span>
          <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">Admin</span>
        </div>
        <ul className="space-y-2 font-medium flex-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin/dashboard")
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center rounded-lg p-2 text-slate-900 transition-colors dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 group",
                    isActive && "bg-slate-100 dark:bg-slate-800"
                  )}
                >
                  <item.icon className={cn("relative z-10 h-5 w-5", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500")} />
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