import { UserSidebar } from "@/components/user-sidebar"
import { UserTopbar } from "@/components/user-topbar"
import { getCurrentUser } from "@/utils/auth-service"
import { redirect } from "next/navigation"

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Double check user role. Admins shouldn't use this layout (they go to /admin)
  if (user.role === "admin") {
    redirect("/admin/dashboard")
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <UserSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <UserTopbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
