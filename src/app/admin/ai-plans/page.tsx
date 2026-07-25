import { createClient } from "@/utils/supabase/server"
import { Layers, CheckCircle2, XCircle } from "lucide-react"

export default async function AIPlansPage() {
  const supabase = await createClient()

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from("ai_plan_profiles")
    .select("*, providers(provider_name, provider_key)")
    .order("plan_key")

  if (error) {
    return <div className="p-8 text-red-500">Error loading AI Plan Profiles: {error.message}</div>
  }

  // Get unique plans and capabilities
  const plans = Array.from(new Set(profiles?.map(p => p.plan_key) || []))
  const capabilities = Array.from(new Set(profiles?.map(p => p.capability) || []))

  // Sort plans logically
  const planOrder = ["FREE", "PRO", "VIP", "BUSINESS", "ENTERPRISE"]
  plans.sort((a, b) => {
    const idxA = planOrder.indexOf(a)
    const idxB = planOrder.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" />
            AI Plan Profiles
          </h1>
          <p className="text-slate-500 mt-1">Configure Business Rules for AI models per User Plan and Capability</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">User Plan</th>
                {capabilities.map(cap => (
                  <th key={cap} className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">{cap}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {plans.map(plan => (
                <tr key={plan} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      plan === 'VIP' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                      plan === 'PRO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                      'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {plan}
                    </span>
                  </td>
                  {capabilities.map(cap => {
                    const profile = profiles?.find(p => p.plan_key === plan && p.capability === cap)
                    return (
                      <td key={cap} className="px-6 py-4">
                        {profile ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                              {profile.providers?.provider_name || profile.providers?.provider_key}
                              {profile.is_active ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-500">
                              {profile.model_id}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                              {profile.credits_per_unit} Credit(s) / Unit
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Not Configured</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={capabilities.length + 1} className="px-6 py-12 text-center text-slate-500">
                    No AI Plan Profiles configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
