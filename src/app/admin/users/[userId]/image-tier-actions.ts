'use server'

import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/utils/roles'
import { revalidatePath } from 'next/cache'

export async function updateUserImageTier(formData: FormData) {
  try {
    const admin = await requireAdmin()
    const supabase = await createClient()

    const userId = formData.get('userId') as string
    const tier = formData.get('tier') as string

    if (!userId || !tier) {
      return { success: false, error: 'Missing required fields' }
    }

    // 1. Get old tier for audit log
    const { data: profile } = await supabase.from('profiles').select('image_tier').eq('id', userId).single()
    const oldTier = profile?.image_tier || 'FREE'

    // 2. Update profiles
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ image_tier: tier })
      .eq('id', userId)

    if (updateErr) throw updateErr

    // 3. Log to audit
    await supabase.from('admin_audit_logs').insert({
      admin_id: admin.id,
      target_user_id: userId,
      action: 'UPDATE_IMAGE_TIER',
      details: {
        old_tier: oldTier,
        new_tier: tier,
      }
    })

    revalidatePath(`/admin/users/${userId}`)
    revalidatePath(`/admin/users`)

    return { success: true }
  } catch (err: any) {
    console.error('updateUserImageTier error:', err)
    return { success: false, error: err.message || 'An error occurred' }
  }
}
