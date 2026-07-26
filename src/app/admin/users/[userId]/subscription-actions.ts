'use server'

import { SubscriptionService } from "@/utils/billing/SubscriptionService"
import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"
import { revalidatePath } from "next/cache"

export async function changeUserPlanAction(formData: FormData) {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const userId = formData.get('userId') as string
    const newPlanId = formData.get('planId') as string
    const reason = formData.get('reason') as string

    if (!userId || !newPlanId) {
      return { success: false, error: 'Missing required fields' }
    }

    await SubscriptionService.changePlan(userId, newPlanId, user.id, reason, 'ADMIN_UI')

    revalidatePath(`/admin/users/${userId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Action error:', error)
    return { success: false, error: error.message || 'Failed to change plan' }
  }
}
