import { ReactNode } from "react"
import { requireAdmin } from "@/utils/roles"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminTopbar } from "@/components/admin-topbar"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Enforce admin role for all routes within /admin
  await requireAdmin()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <AdminTopbar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
