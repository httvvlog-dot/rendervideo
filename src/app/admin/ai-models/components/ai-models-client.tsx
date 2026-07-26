"use client"

import { useState } from "react"
import { PlusCircle, CheckCircle2, XCircle, Pencil, Save, X, Activity, Copy, AlertTriangle } from "lucide-react"
import { saveAIModel, testAIModel } from "../actions"
import { toast } from "sonner"

export function AIModelsClient({ initialModels, providers, providerHealth }: { initialModels: any[], providers: any[], providerHealth: any[] }) {
  const [models, setModels] = useState(initialModels)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Modal states
  const [showWarningModal, setShowWarningModal] = useState<any>(null)
  const [isTesting, setIsTesting] = useState<string | null>(null)

  const handleEdit = (model: any) => {
    setEditingId(model.id)
    setFormData({
      provider_id: model.provider_id || model.providers?.id || "",
      display_name: model.display_name,
      api_slug: model.api_slug,
      capability: model.capability,
      provider_family: model.provider_family || "",
      is_active: model.is_active,
      description: model.description || "",
      priority: model.priority || 0
    })
    setIsCreating(false)
  }

  const handleClone = (model: any) => {
    setEditingId("new")
    setIsCreating(true)
    setFormData({
      provider_id: model.provider_id || model.providers?.id || "",
      display_name: `${model.display_name} - Copy`,
      api_slug: model.api_slug,
      capability: model.capability,
      provider_family: model.provider_family || "",
      is_active: false,
      description: model.description || "",
      priority: model.priority || 0
    })
  }

  const handleCreate = () => {
    setEditingId("new")
    setIsCreating(true)
    setFormData({
      provider_id: providers[0]?.id || "",
      display_name: "",
      api_slug: "",
      capability: "IMAGE_GENERATION",
      provider_family: "",
      is_active: true,
      description: "",
      priority: 0
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsCreating(false)
  }

  const handleSave = async () => {
    if (!formData.provider_id || !formData.display_name || !formData.api_slug || !formData.capability) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc")
      return
    }

    setIsSaving(true)
    
    const payload = {
      provider_id: formData.provider_id,
      display_name: formData.display_name,
      api_slug: formData.api_slug,
      capability: formData.capability,
      provider_family: formData.provider_family,
      is_active: formData.is_active,
      description: formData.description,
      priority: parseInt(formData.priority) || 0
    }

    const res = await saveAIModel(isCreating ? null : editingId, payload)
    
    if (res.success) {
      toast.success(isCreating ? "Tạo model thành công" : "Cập nhật thành công")
      setEditingId(null)
      setIsCreating(false)
      window.location.reload()
    } else {
      toast.error(`Lỗi: ${res.error}`)
    }
    
    setIsSaving(false)
  }

  const requestToggleActive = (model: any) => {
    const plansUsing = model.ai_plan_profiles || []
    if (model.is_active && plansUsing.length > 0) {
      setShowWarningModal(model)
    } else {
      toggleActive(model, false)
    }
  }

  const toggleActive = async (model: any, forceDisable: boolean = false) => {
    const payload = { is_active: !model.is_active }
    setShowWarningModal(null)
    
    const originalModels = [...models]
    setModels(models.map(m => m.id === model.id ? { ...m, is_active: !model.is_active } : m))
    
    const res = await saveAIModel(model.id, payload)
    if (res.success) {
      toast.success(`Đã ${!model.is_active ? 'bật' : 'tắt'} model`)
    } else {
      setModels(originalModels)
      toast.error(res.error || "Lỗi khi cập nhật trạng thái")
    }
  }

  const handleTestModel = async (model: any) => {
    setIsTesting(model.id)
    const res = await testAIModel(model.id)
    if (res.success) {
      toast.success(res.message)
    } else {
      toast.error(res.message)
    }
    setIsTesting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Models</h1>
          <p className="text-slate-500 mt-1">Quản lý tập trung các model AI và cờ năng lực (Features) của hệ thống.</p>
        </div>
        <button 
          onClick={handleCreate}
          disabled={editingId !== null}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white shadow hover:bg-indigo-700 h-9 px-4 py-2"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Thêm Model
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Provider & Slug</th>
                <th className="px-6 py-4 font-medium">Display Name</th>
                <th className="px-6 py-4 font-medium">Capability</th>
                <th className="px-6 py-4 font-medium text-center">Usage</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              
              {/* CREATE ROW */}
              {isCreating && (
                <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
                  <td className="px-4 py-3">
                    <select 
                      className="w-full text-sm border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 mb-2"
                      value={formData.provider_id}
                      onChange={e => setFormData({...formData, provider_id: e.target.value})}
                    >
                      <option value="">-- Chọn Provider --</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.provider_name}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      className="w-full text-sm font-mono border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700"
                      placeholder="API Slug"
                      value={formData.api_slug}
                      onChange={e => setFormData({...formData, api_slug: e.target.value})}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="text" 
                      className="w-full text-sm border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 mb-2"
                      placeholder="Display Name"
                      value={formData.display_name}
                      onChange={e => setFormData({...formData, display_name: e.target.value})}
                    />
                    <input 
                      type="text" 
                      className="w-full text-xs border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 text-slate-500"
                      placeholder="Description"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      className="w-full text-sm border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 mb-2"
                      value={formData.capability}
                      onChange={e => setFormData({...formData, capability: e.target.value})}
                    >
                      <option value="IMAGE_GENERATION">IMAGE_GENERATION</option>
                      <option value="VOICE_GENERATION">VOICE_GENERATION</option>
                      <option value="TEXT_GENERATION">TEXT_GENERATION</option>
                    </select>
                    <input 
                      type="number" 
                      className="w-20 text-xs border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 text-slate-500 inline-block"
                      placeholder="Priority"
                      title="Priority"
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value})}
                    />
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400">0</td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer ${formData.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}
                    >
                      {formData.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        title="Save"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={handleCancel}
                        disabled={isSaving} 
                        className="p-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {models && models.map((model: any) => {
                const isEditing = editingId === model.id;
                const plansUsing = model.ai_plan_profiles || []
                const usageCount = plansUsing.length
                
                if (isEditing) {
                  const isLocked = usageCount > 0;
                  return (
                    <tr key={model.id} className="bg-indigo-50/50 dark:bg-indigo-900/10">
                      <td className="px-4 py-3">
                        <select 
                          className={`w-full text-sm border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 mb-2 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          value={formData.provider_id}
                          disabled={isLocked}
                          title={isLocked ? "Cannot edit provider while in use by Plans" : ""}
                          onChange={e => setFormData({...formData, provider_id: e.target.value})}
                        >
                          <option value="">-- Chọn Provider --</option>
                          {providers.map(p => (
                            <option key={p.id} value={p.id}>{p.provider_name}</option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          className={`w-full text-sm font-mono border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          placeholder="API Slug"
                          disabled={isLocked}
                          title={isLocked ? "Cannot edit slug while in use by Plans" : ""}
                          value={formData.api_slug}
                          onChange={e => setFormData({...formData, api_slug: e.target.value})}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          className="w-full text-sm border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 mb-2"
                          placeholder="Display Name"
                          value={formData.display_name}
                          onChange={e => setFormData({...formData, display_name: e.target.value})}
                        />
                        <input 
                          type="text" 
                          className="w-full text-xs border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 text-slate-500"
                          placeholder="Description"
                          value={formData.description}
                          onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="w-full text-sm border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 mb-2"
                          value={formData.capability}
                          onChange={e => setFormData({...formData, capability: e.target.value})}
                        >
                          <option value="IMAGE_GENERATION">IMAGE_GENERATION</option>
                          <option value="VOICE_GENERATION">VOICE_GENERATION</option>
                          <option value="TEXT_GENERATION">TEXT_GENERATION</option>
                        </select>
                        <input 
                          type="number" 
                          className="w-20 text-xs border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 text-slate-500 inline-block"
                          placeholder="Priority"
                          title="Priority"
                          value={formData.priority}
                          onChange={e => setFormData({...formData, priority: e.target.value})}
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{usageCount}</td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer ${formData.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}
                        >
                          {formData.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            title="Save"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={handleCancel}
                            disabled={isSaving} 
                            className="p-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                // Render normal row
                const providerName = Array.isArray(model.providers) ? model.providers[0]?.provider_name : model.providers?.provider_name
                const providerKey = Array.isArray(model.providers) ? model.providers[0]?.provider_key : model.providers?.provider_key
                const health = providerHealth.find(p => p.provider_key === providerKey)
                const isHealthy = health?.is_healthy

                return (
                  <tr key={model.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!model.is_active ? 'opacity-70' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        {providerName}
                        {health && (
                          <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`} title={isHealthy ? 'Healthy Credentials Found' : 'No Active/Healthy Credentials'} />
                        )}
                      </div>
                      <code className="rounded bg-slate-100 px-2 py-1 mt-1 inline-block text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {model.api_slug}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{model.display_name}</div>
                      {model.description && <div className="text-xs text-slate-500 line-clamp-1" title={model.description}>{model.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        {model.capability}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center group relative cursor-default">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${usageCount > 0 ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {usageCount}
                      </span>
                      {usageCount > 0 && (
                        <div className="absolute hidden group-hover:block z-10 w-max max-w-xs p-2 mt-1 -ml-4 text-xs bg-slate-900 text-white rounded shadow-lg">
                          Used by: {plansUsing.map((p: any) => p.plan_key).join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => requestToggleActive(model)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${model.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-300'}`}
                      >
                        {model.is_active ? (
                          <><CheckCircle2 className="mr-1 h-3 w-3" /> Active</>
                        ) : (
                          <><XCircle className="mr-1 h-3 w-3" /> Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => handleTestModel(model)}
                          disabled={isTesting === model.id}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:text-blue-400 dark:hover:bg-blue-900/30 font-medium disabled:opacity-50 transition-colors"
                          title="Test Provider Validation"
                        >
                          <Activity className={`h-4 w-4 ${isTesting === model.id ? 'animate-pulse' : ''}`} />
                        </button>
                        <button 
                          onClick={() => handleClone(model)}
                          disabled={editingId !== null}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                          title="Clone Model"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(model)}
                          disabled={editingId !== null}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/30 font-medium disabled:opacity-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              
              {models?.length === 0 && !isCreating && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Chưa có model nào. Hãy tạo model đầu tiên.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Deactivate Model?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  This model is currently used by: <strong>{showWarningModal.ai_plan_profiles.map((p:any) => p.plan_key).join(", ")}</strong>.
                </p>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-500 mt-2">
                  Changing status may interrupt image generation.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowWarningModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              {/* Note: This is practically a Force Disable because we bypassed normal flow */}
              <button 
                onClick={() => toggleActive(showWarningModal, true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium shadow-sm"
              >
                Force Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
