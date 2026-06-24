import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"

export default async function AuthDebugPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  let profile = null
  let profileError = null
  let rlsStatus = "Unknown"

  if (user) {
    const res = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = res.data
    profileError = res.error
    
    // Test RLS by running a count
    const { count, error: countError } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    rlsStatus = countError ? `Blocked or Error: ${countError.message}` : `OK (Count: ${count})`
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      <h1 className="text-2xl font-bold">Authentication Diagnostic</h1>
      
      <div className="space-y-2 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">1. Session Status</h2>
        <p>Session Found: {session ? "✅ YES" : "❌ NO"}</p>
        <p>Session Error: {sessionError?.message || "None"}</p>
      </div>

      <div className="space-y-2 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">2. User Status</h2>
        <p>User Found: {user ? "✅ YES" : "❌ NO"}</p>
        <p>User ID: {user?.id || "N/A"}</p>
        <p>Email: {user?.email || "N/A"}</p>
        <p>Email Confirmed: {user?.email_confirmed_at ? "✅ YES" : "❌ NO"}</p>
        <p>User Error: {userError?.message || "None"}</p>
      </div>

      <div className="space-y-2 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">3. Profile Status (Server-side)</h2>
        <p>Profile Found: {profile ? "✅ YES" : "❌ NO"}</p>
        <p>Profile ID matches User ID: {profile && user && profile.id === user.id ? "✅ YES" : "❌ NO"}</p>
        <p>Role: {profile?.role || "null"}</p>
        <p>Profile Lookup Error: {profileError?.message || "None"}</p>
        <p>Profile Error Details: {JSON.stringify(profileError?.details || "")}</p>
        <p>RLS Status (can read profiles?): {rlsStatus}</p>
      </div>

      <div className="space-y-2 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">Raw Data Dump</h2>
        <pre className="text-xs overflow-auto p-4 bg-slate-800 text-slate-50 rounded-md">
          {JSON.stringify({ session, user, profile, profileError }, null, 2)}
        </pre>
      </div>
    </div>
  )
}
