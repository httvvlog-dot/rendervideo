import { createClient } from "@/utils/supabase/server"

export class SubscriptionService {
  /**
   * Change a user's subscription plan.
   * This is a transactional operation that expires the old plan and creates a new one.
   */
  static async changePlan(
    userId: string,
    newPlanId: string,
    adminId: string,
    reason: string,
    source: string = 'ADMIN_UI'
  ) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('admin_change_subscription_plan', {
      p_user_id: userId,
      p_new_plan_id: newPlanId,
      p_admin_id: adminId,
      p_reason: reason,
      p_source: source
    })

    if (error) {
      console.error('Failed to change subscription plan:', error)
      throw new Error(`Failed to change plan: ${error.message}`)
    }

    return data
  }
}
