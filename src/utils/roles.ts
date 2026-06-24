import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return { user, profile }
}

export async function requireAdmin() {
  const { user, profile } = await requireUser()

  if (profile.role !== 'admin') {
    redirect('/unauthorized')
  }

  return { user, profile }
}
