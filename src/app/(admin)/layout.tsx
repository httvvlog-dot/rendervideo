import { ReactNode } from 'react'
import { requireAdmin } from '@/utils/roles'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Enforce admin role for all routes within (admin)
  await requireAdmin()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-10 border-b bg-white dark:bg-slate-950 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">TaoVideo Admin Dashboard</h1>
      </header>
      <div className="flex flex-1">
        <aside className="w-64 border-r bg-white dark:bg-slate-950 p-6 hidden md:block">
          <nav className="flex flex-col gap-4">
            <a href="/dashboard" className="text-sm font-medium hover:text-blue-600">Dashboard</a>
            <a href="/users" className="text-sm font-medium hover:text-blue-600">Users</a>
            <a href="/providers" className="text-sm font-medium hover:text-blue-600">Providers</a>
            <a href="/templates" className="text-sm font-medium hover:text-blue-600">Templates</a>
            <a href="/settings" className="text-sm font-medium hover:text-blue-600">Settings</a>
          </nav>
        </aside>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
