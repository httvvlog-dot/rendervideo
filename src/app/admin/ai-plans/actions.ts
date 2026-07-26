"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateAIPlanProfile(
  planKey: string,
  capability: string,
  providerId: string,
  aiModelId: string,
  creditsPerUnit: number,
  isActive: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.role !== "admin") {
    return { error: "Unauthorized" }
  }

  const { error } = await supabase
    .from("ai_plan_profiles")
    .upsert(
      {
        plan_key: planKey,
        capability: capability,
        provider_id: providerId,
        ai_model_id: aiModelId,
        credits_per_unit: creditsPerUnit,
        is_active: isActive,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'plan_key,capability' }
    )

  if (error) {
    console.error("Failed to update AI Plan Profile", error)
    return { error: error.message }
  }

  revalidatePath("/admin/ai-plans")
  return { success: true }
}
