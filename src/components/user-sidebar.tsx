"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { LayoutDashboard, FolderKanban, DownloadCloud, User, Video } from "lucide-react"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Projects", href: "/projects", icon: FolderKanban },
  { name: "Downloads", href: "/downloads", icon: DownloadCloud },
  { name: "Profile", href: "/profile", icon: User },
]

export function UserSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white/80 backdrop-blur-md transition-transform dark:bg-slate-950/80 hidden lg:block">
      <div className="flex h-full flex-col px-3 py-4">
        <div className="mb-6 px-3 flex items-center space-x-2">
          <Video className="h-6 w-6 text-indigo-600" />
          <span className="text-xl font-bold tracking-tight">TaoVideo</span>
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
