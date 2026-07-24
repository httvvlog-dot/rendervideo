import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/auth-service";

export default async function DebugSystemPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  
  let wallet = null;
  if (user) {
    const { data } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();
    wallet = data;
  }

  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL 
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.split("//")[1]?.split(".")[0] 
    : "Unknown";

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 font-mono text-sm bg-slate-950 text-emerald-400 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-6">System Health Check</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-800 p-4 rounded-lg bg-slate-900">
          <h2 className="text-white font-bold mb-2 border-b border-slate-700 pb-2">Environment</h2>
          <p><span className="text-slate-400">APP_VERSION:</span> 2026.07.24.01</p>
          <p><span className="text-slate-400">NODE_ENV:</span> {process.env.NODE_ENV}</p>
          <p><span className="text-slate-400">Project Ref:</span> {projectRef}</p>
          <p><span className="text-slate-400">Supabase URL:</span> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        </div>

        <div className="border border-slate-800 p-4 rounded-lg bg-slate-900">
          <h2 className="text-white font-bold mb-2 border-b border-slate-700 pb-2">Auth</h2>
          {user ? (
            <>
              <p><span className="text-slate-400">User Email:</span> {user.email}</p>
              <p><span className="text-slate-400">User ID:</span> {user.id}</p>
              <p><span className="text-slate-400">Role:</span> {user.role}</p>
            </>
          ) : (
            <p className="text-rose-400">Not Logged In</p>
          )}
        </div>

        <div className="border border-slate-800 p-4 rounded-lg bg-slate-900 col-span-1 md:col-span-2">
          <h2 className="text-white font-bold mb-2 border-b border-slate-700 pb-2">Wallet Status</h2>
          {wallet ? (
            <div className="grid grid-cols-2 gap-2">
              <p><span className="text-slate-400">Wallet ID:</span> {wallet.id}</p>
              <p><span className="text-slate-400">User ID:</span> {wallet.user_id}</p>
              <p><span className="text-slate-400">Balance:</span> {wallet.balance_credits}</p>
              <p><span className="text-slate-400">Total Purchased:</span> {wallet.total_purchased_credits}</p>
              <p><span className="text-slate-400">Total Bonus:</span> {wallet.total_bonus_credits}</p>
              <p><span className="text-slate-400">Status:</span> {wallet.status}</p>
            </div>
          ) : (
            <p className="text-rose-400">{user ? "No wallet found for this user" : "N/A"}</p>
          )}
        </div>
      </div>
    </div>
  );
}
