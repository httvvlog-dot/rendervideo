import { createClient } from "@/utils/supabase/server"
import { PricingClient } from "./components/pricing-client"
import { getCurrentUser } from "@/utils/auth-service"
import { redirect } from "next/navigation"

export default async function AdminPricingPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    redirect('/auth/login')
  }
  const supabase = await createClient()

  const { data: pricing } = await supabase
    .from("service_pricing")
    .select("*")
    .order("id")

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Service Pricing Configuration</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage internal cost and profit margins. Selling price will be automatically calculated and displayed to users.
        </p>
      </div>

      <PricingClient initialData={pricing || []} />
    </div>
  )
}
