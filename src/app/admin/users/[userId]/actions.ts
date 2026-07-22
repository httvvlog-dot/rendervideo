"use server"

import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"
import { revalidatePath } from "next/cache"

export async function grantUserCreditsAction(
  userId: string,
  amount: number,
  bucketType: 'PURCHASED' | 'WELCOME_BONUS',
  expireDays: number | null,
  description: string
) {
  await requireAdmin()
  const supabase = await createClient()

  let expiresAt = null
  if (expireDays) {
    const d = new Date()
    d.setDate(d.getDate() + expireDays)
    expiresAt = d.toISOString()
  }

  const { data, error } = await supabase.rpc('grant_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_bucket_type: bucketType,
    p_expires_at: expiresAt,
    p_description: description
  })

  if (error) throw new Error(error.message)
  
  // Log the action manually since the DB trigger might not capture the admin id perfectly without a custom claims setup
  const admin = await supabase.auth.getUser()
  if (admin.data.user) {
    await supabase.from('admin_audit_logs').insert({
      admin_id: admin.data.user.id,
      target_user_id: userId,
      action: 'GRANT_CREDIT',
      new_value: { amount, bucketType, expireDays, description },
      reason: description
    })
  }

  revalidatePath(`/admin/users/${userId}`)
  return data
}

export async function adjustUserCreditsAction(
  userId: string,
  amount: number,
  description: string
) {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('admin_adjust_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_description: description
  })

  if (error) throw new Error(error.message)
    
  const admin = await supabase.auth.getUser()
  if (admin.data.user) {
    await supabase.from('admin_audit_logs').insert({
      admin_id: admin.data.user.id,
      target_user_id: userId,
      action: 'ADJUST_CREDIT',
      new_value: { amount, description },
      reason: description
    })
  }

  revalidatePath(`/admin/users/${userId}`)
  return data
}

export async function updateUserStatusAction(
  userId: string,
  newStatus: 'active' | 'suspended' | 'deleted'
) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId)
  if (error) throw new Error(error.message)

  const admin = await supabase.auth.getUser()
  if (admin.data.user) {
    await supabase.from('admin_audit_logs').insert({
      admin_id: admin.data.user.id,
      target_user_id: userId,
      action: 'CHANGE_STATUS',
      new_value: { status: newStatus },
      reason: `Changed to ${newStatus}`
    })
  }

  revalidatePath(`/admin/users/${userId}`)
  return true
}
