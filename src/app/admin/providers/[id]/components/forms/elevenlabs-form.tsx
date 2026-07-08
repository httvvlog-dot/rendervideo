"use client"

import { useState } from "react"
import { saveProvider, syncElevenLabsVoices } from "../../../actions"
import { toast } from "sonner"
import { Activity, DownloadCloud } from "lucide-react"
import { SecretInput } from "../../../components/secret-input"

export function ElevenLabsForm({ provider }: { provider: any }) {
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  const config = provider?.config_json || {}

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      provider_key: provider.provider_key,
      is_active: formData.get("is_active") === "true",
      config: {
        apiKey: formData.get("apiKey")
      }
    }

    try {
      const res = await saveProvider(payload)
      if (res.error) toast.error(res.error)
      else toast.success("Configuration saved successfully")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const res = await syncElevenLabsVoices(provider.provider_key)
      if (res.success) {
        toast.success(res.message)
      } else {
        toast.error(res.error || "Failed to sync voices")
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold">ElevenLabs Configuration</h2>
          <p className="text-sm text-slate-500">Configure your ElevenLabs TTS connection.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status</label>
          <select 
            name="is_active" 
            defaultValue={provider?.is_active ? "true" : "false"}
            className="border rounded-lg px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800"
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">API Key <span className="text-red-500">*</span></label>
          <SecretInput name="apiKey" defaultValue={config.apiKey} placeholder="xi-..." />
        </div>
      </div>

      <div className="pt-4 border-t flex justify-between items-center">
        <button 
          type="button" 
          onClick={handleSync}
          disabled={isSyncing}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {isSyncing ? <Activity className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
          Sync Voices
        </button>

        <button 
          type="submit" 
          disabled={isSaving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"
        >
          {isSaving && <Activity className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </form>
  )
}
