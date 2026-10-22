"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/utils/roles"
import { revalidatePath } from "next/cache"

export async function adminReleaseReservationAction(
  transactionId: string,
  reason: string = "Released manually by Admin"
) {
  await requireAdmin()
  const supabaseServer = await createClient()
  const adminClient = createAdminClient()

  const { data, error } = await adminClient.rpc('release_credits', {
    p_transaction_id: transactionId,
    p_reason: reason
  })

  if (error) {
    throw new Error(error.message)
  }

  const admin = await supabaseServer.auth.getUser()
  if (admin.data.user) {
    await adminClient.from('admin_audit_logs').insert({
      admin_id: admin.data.user.id,
      action: 'RELEASE_RESERVATION',
      new_value: { transactionId, reason },
      reason: reason
    })
  }

  revalidatePath('/admin/billing')
  return { success: !!data }
}
