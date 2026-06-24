import { ReactNode } from 'react'
import { requireUser } from '@/utils/roles'

export default async function UserLayout({ children }: { children: ReactNode }) {
  // Enforce user role for all routes within (user)
  await requireUser()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-white dark:bg-slate-950 px-6">
        <h1 className="text-xl font-bold tracking-tight">TaoVideo</h1>
        <nav className="ml-auto flex gap-6">
          <a href="/dashboard" className="text-sm font-medium hover:text-blue-600">Dashboard</a>
          <a href="/projects" className="text-sm font-medium hover:text-blue-600">Projects</a>
          <a href="/downloads" className="text-sm font-medium hover:text-blue-600">Downloads</a>
        </nav>
      </header>
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}
