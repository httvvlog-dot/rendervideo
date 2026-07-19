import { createClient } from "@/utils/supabase/server";

export default async function WalletsPage() {
  const supabase = await createClient();
  const { data: wallets } = await supabase.from("wallets").select("*").limit(50);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">User Wallets</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">User ID</th>
              <th className="px-6 py-3 font-medium">Lifetime Earned</th>
              <th className="px-6 py-3 font-medium">Lifetime Used</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {wallets?.map(w => (
              <tr key={w.id} className="hover:bg-slate-800/50">
                <td className="px-6 py-4 font-mono text-xs">{w.user_id}</td>
                <td className="px-6 py-4 text-emerald-400">+{w.lifetime_earned}</td>
                <td className="px-6 py-4 text-rose-400">-{w.lifetime_used}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-blue-400 hover:text-blue-300">View Buckets</button>
                </td>
              </tr>
            ))}
            {(!wallets || wallets.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No wallets found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
