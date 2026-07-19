import { createClient } from "@/utils/supabase/server";

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: rules } = await supabase.from("credit_rules").select("*, provider_model_pricing(*)").order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">AI Pricing & Credit Rules</h2>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm">Add Rule</button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Feature</th>
              <th className="px-6 py-3 font-medium">Provider / Model</th>
              <th className="px-6 py-3 font-medium">User Charge</th>
              <th className="px-6 py-3 font-medium">API Cost</th>
              <th className="px-6 py-3 font-medium">Version</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rules?.map(r => (
              <tr key={r.id} className="hover:bg-slate-800/50">
                <td className="px-6 py-4 font-semibold text-white">{r.feature}</td>
                <td className="px-6 py-4">{r.provider_model_pricing?.provider} / <span className="font-mono text-xs">{r.provider_model_pricing?.model}</span></td>
                <td className="px-6 py-4 text-emerald-400 font-bold">{r.credit_cost} Credits</td>
                <td className="px-6 py-4 text-rose-400">${Number(r.provider_model_pricing?.api_cost).toFixed(4)}</td>
                <td className="px-6 py-4 text-slate-500">v{r.version}</td>
              </tr>
            ))}
            {(!rules || rules.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No pricing rules configured. Please seed the database.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
