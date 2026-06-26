import { ReactNode } from "react"
import { requireUser } from "@/utils/roles"
import { UserSidebar } from "@/components/user-sidebar"
import { UserTopbar } from "@/components/user-topbar"

export default async function UserLayout({ children }: { children: ReactNode }) {
  // Enforce user role for all routes within /(user)
  await requireUser()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <UserSidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <UserTopbar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
