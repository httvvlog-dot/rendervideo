"use server"

import { createAdminClient } from "@/utils/supabase/admin"
import { getCurrentUser } from "@/utils/auth-service"
import { revalidatePath } from "next/cache"

export async function updateServicePricing(serviceKey: string, costVnd: number, profitPercent: number) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      throw new Error("Unauthorized")
    }

    if (costVnd < 0 || profitPercent < 0) {
      return { success: false, error: "Cost and profit must be >= 0" }
    }

    const sellingPrice = Math.round(costVnd * (1 + profitPercent / 100))

    const supabase = await createAdminClient()

    const { error } = await supabase
      .from("service_pricing")
      .update({
        cost_vnd: costVnd,
        profit_percent: profitPercent,
        selling_price_vnd: sellingPrice,
        updated_at: new Date().toISOString()
      })
      .eq("service_key", serviceKey)

    if (error) {
      console.error("Failed to update service pricing:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/pricing")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update pricing" }
  }
}
