import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminTopbar } from "@/components/admin-topbar"
import { getCurrentUser } from "@/utils/auth-service"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  console.log("=== ADMIN DEBUG ===");
  console.log("auth user id:", user?.id);
  console.log("profile:", user);
  console.log("profile.role:", user?.role);
  console.log("role check result:", user?.role === "admin");


  if (!user || user.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}