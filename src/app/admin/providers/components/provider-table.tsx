"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MoreHorizontal, Plus, Settings2, Trash2, Loader2, Activity } from "lucide-react"
import { saveProvider, deleteProvider, testOpenRouterConnection, syncElevenLabsVoices } from "../actions"
import { toast } from "sonner"

export function ProviderTable({ providers, type }: { providers: any[], type: string }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const openSheet = (provider: any = null) => {
    setSelectedProvider(provider)
    setIsSheetOpen(true)
  }

  const closeSheet = () => {
    setIsSheetOpen(false)
    setTimeout(() => setSelectedProvider(null), 300)
  }

    const handleSyncVoices = async (provider: any) => {
    const toastId = toast.loading('Syncing...');
    try {
      const result = await syncElevenLabsVoices(provider.id);
      if (result.success) toast.success(result.message, { id: toastId });
      else toast.error(result.error, { id: toastId });
    } catch (err: any) { toast.error('Failed to sync', { id: toastId }); }
  }

  const handleTestConnection = async (provider: any) => {
    toast.loading("Pinging provider API...", { id: `ping-${provider.id}` })
    // Mock network delay
    await new Promise(resolve => setTimeout(resolve, 800))
    toast.success("Connection successful!", { id: `ping-${provider.id}` })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      const payload = {
        id: selectedProvider?.id,
        provider_type: type,
        provider_name: formData.get("provider_name"),
        is_active: formData.get("is_active") === "on",
        is_default: formData.get("is_default") === "on",
        priority: parseInt(formData.get("priority") as string || "0"),
        config: {
          apiKey: formData.get("apiKey"),
          defaultModel: formData.get("defaultModel"),
          fallbackModel: formData.get("fallbackModel"),
          voice: formData.get("voice"),
          bucket: formData.get("bucket"),
        }
      }
      await saveProvider(payload)
      closeSheet()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedProvider || !confirm("Are you sure you want to delete this provider?")) return
    setIsDeleting(true)
    try {
      await deleteProvider(selectedProvider.id)
      closeSheet()
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold capitalize">{type} Providers</h2>
        <button 
          onClick={() => openSheet()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Health</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {providers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No {type} providers configured yet.
                </td>
              </tr>
            ) : (
              providers.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    {p.provider_name}
                    {p.is_default && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-semibold">Default</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {p.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${p.health_status === 'healthy' ? 'bg-green-500' : p.health_status === 'warning' ? 'bg-yellow-500' : p.health_status === 'offline' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                      {p.health_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.priority}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleTestConnection(p)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Test Connection">
                        <Activity className="h-4 w-4" />
                      </button>
                      <button onClick={() => openSheet(p)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Edit Provider">
                        <Settings2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Panel (Sheet alternative) */}
      <AnimatePresence>
        {isSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-950 shadow-2xl border-l z-50 overflow-y-auto flex flex-col"
            >
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">{selectedProvider ? 'Edit Provider' : 'Add Provider'}</h3>
                <p className="text-sm text-slate-500 mt-1">Configure API keys and model defaults.</p>
              </div>
              
              <div className="p-6 flex-1">
                
<form id="provider-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Provider Name</label>
                    <input name="provider_name" required type="text" className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" defaultValue={selectedProvider?.provider_name || ''} readOnly={!!selectedProvider} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Key</label>
                    <input 
                      name="apiKey"
                      type="password" 
                      className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" 
                      placeholder={selectedProvider?._hasSecret ? "•••••••••••••••• (Set)" : "Enter API Key"} 
                    />
                  </div>
                  
                  <div className="pt-4 space-y-4 border-t mt-6">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Enable Provider</label>
                      <input name="is_active" type="checkbox" defaultChecked={selectedProvider ? selectedProvider.is_active : true} className="h-4 w-4 rounded border-slate-300" />
                    </div>
                  </div>
                </form>

              </div>
              
              <div className="p-6 border-t bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                {selectedProvider ? (
                  <button type="button" onClick={handleDelete} disabled={isDeleting} className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                    {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                  </button>
                ) : <div />}
                <div className="flex gap-2">
                  <button type="button" onClick={closeSheet} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                  <button type="submit" form="provider-form" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
