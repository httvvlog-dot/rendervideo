import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function requireUser() {
  console.log('[AUTH DIAGNOSTIC] requireUser check started')
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.log('[AUTH DIAGNOSTIC] getUser error:', error.message)
    redirect('/login')
  }

  if (!user) {
    console.log('[AUTH DIAGNOSTIC] No user found in session, redirecting to /login')
    redirect('/login')
  }

  console.log(`[AUTH DIAGNOSTIC] User session found. ID: ${user.id}, Email: ${user.email}, Confirmed At: ${user.email_confirmed_at || 'Not confirmed'}`)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.log(`[AUTH DIAGNOSTIC] Profile lookup error for user ${user.id}:`, profileError.message)
    redirect('/login')
  }

  if (!profile) {
    console.log(`[AUTH DIAGNOSTIC] No profile found for user ${user.id}. Redirecting to /login`)
    redirect('/login')
  }

  console.log(`[AUTH DIAGNOSTIC] Profile found. ID: ${profile.id}, Role: ${profile.role}`)

  return { user, profile }
}

export async function requireAdmin() {
  console.log('[AUTH DIAGNOSTIC] requireAdmin check started')
  const { user, profile } = await requireUser()

  if (profile.role !== 'admin') {
    console.log(`[AUTH DIAGNOSTIC] User ${profile.email} is not an admin (Role: ${profile.role}). Redirecting to /unauthorized`)
    redirect('/unauthorized')
  }

  console.log('[AUTH DIAGNOSTIC] Admin access granted.')
  return { user, profile }
}
