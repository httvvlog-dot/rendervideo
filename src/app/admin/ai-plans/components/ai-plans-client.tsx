"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Edit } from "lucide-react"
import { updateAIPlanProfile } from "../actions"

export function AIPlansClient({ initialProfiles, providers, models }: { initialProfiles: any[], providers: any[], models: any[] }) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [editingPlan, setEditingPlan] = useState<{ plan: string, capability: string } | null>(null)
  const [editForm, setEditForm] = useState({ providerId: "", aiModelId: "", creditsPerUnit: 1, isActive: true })
  
  const plans = Array.from(new Set(profiles.map(p => p.plan_key)))
  const planOrder = ["FREE", "PRO", "VIP", "BUSINESS", "ENTERPRISE"]
  plans.sort((a, b) => {
    const idxA = planOrder.indexOf(a)
    const idxB = planOrder.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })

  // We should predefined capabilities based on our enum
  const capabilities = ["IMAGE_GENERATION", "VIDEO_GENERATION", "VOICE_GENERATION", "TEXT_GENERATION"]

  const handleEditClick = (plan: string, capability: string, profile: any) => {
    setEditingPlan({ plan, capability })
    if (profile) {
      setEditForm({
        providerId: profile.provider_id || "",
        aiModelId: profile.ai_model_id || "",
        creditsPerUnit: profile.credits_per_unit || 1,
        isActive: profile.is_active
      })
    } else {
      setEditForm({
        providerId: providers[0]?.id || "",
        aiModelId: "",
        creditsPerUnit: 1,
        isActive: true
      })
    }
  }

  const handleSave = async () => {
    if (!editingPlan) return
    if (!editForm.providerId || !editForm.aiModelId) {
      alert("Vui lòng chọn đầy đủ Provider và Model")
      return
    }

    const { success, error } = await updateAIPlanProfile(
      editingPlan.plan,
      editingPlan.capability,
      editForm.providerId,
      editForm.aiModelId,
      editForm.creditsPerUnit,
      editForm.isActive
    )

    if (error) {
      alert("Lỗi: " + error)
    } else {
      // Optimistic update
      setProfiles(prev => {
        const idx = prev.findIndex(p => p.plan_key === editingPlan.plan && p.capability === editingPlan.capability)
        const updatedProfile = {
          plan_key: editingPlan.plan,
          capability: editingPlan.capability,
          provider_id: editForm.providerId,
          ai_model_id: editForm.aiModelId,
          credits_per_unit: editForm.creditsPerUnit,
          is_active: editForm.isActive,
          providers: providers.find(p => p.id === editForm.providerId),
          ai_models: models.find(m => m.id === editForm.aiModelId)
        }
        if (idx !== -1) {
          const next = [...prev]
          next[idx] = updatedProfile
          return next
        }
        return [...prev, updatedProfile]
      })
      setEditingPlan(null)
    }
  }

  const availableModels = models.filter(m => m.provider_id === editForm.providerId)

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b">
            <tr>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">User Plan</th>
              {capabilities.map(cap => (
                <th key={cap} className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">{cap.replace('_GENERATION', '')}</th>
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
                  const profile = profiles.find(p => p.plan_key === plan && p.capability === cap)
                  const isEditing = editingPlan?.plan === plan && editingPlan?.capability === cap
                  
                  if (isEditing) {
                    return (
                      <td key={cap} className="px-6 py-4 min-w-[280px]">
                        <div className="flex flex-col gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Provider</label>
                            <select 
                              className="w-full text-xs rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                              value={editForm.providerId}
                              onChange={e => {
                                setEditForm({...editForm, providerId: e.target.value, aiModelId: ""})
                              }}
                            >
                              <option value="" disabled>Select Provider</option>
                              {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.provider_name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Model</label>
                            <select 
                              className="w-full text-xs rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                              value={editForm.aiModelId}
                              onChange={e => setEditForm({...editForm, aiModelId: e.target.value})}
                              disabled={!editForm.providerId}
                            >
                              <option value="" disabled>Select Model</option>
                              {availableModels.map(m => (
                                <option key={m.id} value={m.id}>{m.display_name} ({m.api_slug})</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Credits/Unit</label>
                              <input 
                                type="number" 
                                className="w-full text-xs rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                value={editForm.creditsPerUnit}
                                onChange={e => setEditForm({...editForm, creditsPerUnit: parseInt(e.target.value) || 0})}
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                              <input 
                                type="checkbox" 
                                checked={editForm.isActive}
                                onChange={e => setEditForm({...editForm, isActive: e.target.checked})}
                              />
                              <label className="text-[10px] font-semibold text-slate-500 uppercase">Active</label>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 rounded font-medium transition-colors">
                              Save
                            </button>
                            <button onClick={() => setEditingPlan(null)} className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs py-1.5 rounded font-medium transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    )
                  }

                  return (
                    <td key={cap} className="px-6 py-4 group cursor-pointer" onClick={() => handleEditClick(plan, cap, profile)}>
                      {profile ? (
                        <div className="flex flex-col gap-1 relative">
                          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                            {Array.isArray(profile.providers) ? profile.providers[0]?.provider_name : profile.providers?.provider_name}
                            {profile.is_active ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                          <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                            {Array.isArray(profile.ai_models) ? profile.ai_models[0]?.display_name : profile.ai_models?.display_name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                            {profile.credits_per_unit} Credit(s) / Unit
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
                          <span className="text-slate-400 italic text-xs">Not Configured</span>
                          <Edit className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            
            {/* Row to add new plan type */}
            <tr className="bg-slate-50 dark:bg-slate-800/30">
              <td colSpan={capabilities.length + 1} className="px-6 py-4 text-center">
                <button 
                  onClick={() => {
                    const newPlan = prompt("Enter new plan key (e.g. ENTERPRISE):")
                    if (newPlan && !plans.includes(newPlan.toUpperCase())) {
                      setProfiles([...profiles, { plan_key: newPlan.toUpperCase(), capability: capabilities[0] }])
                    }
                  }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  + Add New Plan
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
