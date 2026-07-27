'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/utils/roles'
import { revalidatePath } from 'next/cache'

export async function updateUserImageTier(formData: FormData) {
  try {
    const admin = await requireAdmin()
    const supabaseServer = await createClient()
    const adminClient = createAdminClient()

    const userId = formData.get('userId') as string
    const tier = formData.get('tier') as string

    if (!userId || !tier) {
      return { success: false, error: 'Missing required fields' }
    }

    // 1. Get old tier for audit log
    const { data: oldProfile } = await adminClient.from('profiles').select('image_tier').eq('id', userId).single()
    const oldTier = oldProfile?.image_tier || 'FREE'

    // 2. Update profiles using adminClient to bypass RLS
    const { error: updateErr } = await adminClient
      .from('profiles')
      .update({ image_tier: tier })
      .eq('id', userId)

    if (updateErr) throw updateErr

    // 3. Read back from DB to confirm update
    const { data: updatedProfile } = await adminClient.from('profiles').select('image_tier').eq('id', userId).single()
    const newTier = updatedProfile?.image_tier || tier

    // 4. Log to audit
    await adminClient.from('admin_audit_logs').insert({
      admin_id: admin.id,
      target_user_id: userId,
      action: 'UPDATE_IMAGE_TIER',
      details: {
        old_image_tier: oldTier,
        new_image_tier: newTier,
      }
    })

    revalidatePath(`/admin/users/${userId}`)
    revalidatePath(`/admin/users`)

    return { success: true, imageTier: newTier }
  } catch (err: any) {
    console.error('updateUserImageTier error:', err)
    return { success: false, error: err.message || 'An error occurred', imageTier: 'FREE' }
  }
}
