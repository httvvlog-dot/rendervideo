"use client"

import { useState } from "react"
import { saveProvider } from "../../../../actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function ElevenLabsForm({ provider }: { provider: any }) {
  const [isSaving, setIsSaving] = useState(false)
  const config = provider.config_json || {}

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      const payload = {
        id: provider.id,
        provider_type: provider.provider_type,
        provider_name: provider.provider_name,
        is_active: formData.get("is_active") === "on",
        is_default: formData.get("is_default") === "on",
        priority: parseInt(formData.get("priority") as string || "0"),
        config: {
          apiKey: formData.get("apiKey"),
          voice: formData.get("voice"),
        }
      }
      const res = await saveProvider(payload)
      if (res && res.error) toast.error(res.error)
      else toast.success("ElevenLabs config saved successfully")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 border rounded-xl p-6">
      <h3 className="text-lg font-semibold border-b pb-4">ElevenLabs Settings</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">API Key</label>
          <input 
            name="apiKey"
            type="password" 
            className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800" 
            placeholder={provider._hasSecret ? "•••••••••••••••• (Set)" : "Enter ElevenLabs API Key"} 
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Default Voice ID</label>
          <input 
            name="voice"
            type="text" 
            defaultValue={config.voice || ""}
            className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800" 
            placeholder="e.g. 21m00Tcm4TlvDq8ikWAM" 
          />
          <p className="text-xs text-slate-500 mt-1">Voice selection UI will be added in Phase C.</p>
        </div>

        <div className="flex gap-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_active" id="is_active" defaultChecked={provider.is_active} className="rounded" />
            <label htmlFor="is_active" className="text-sm font-medium">Active</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_default" id="is_default" defaultChecked={provider.is_default} className="rounded" />
            <label htmlFor="is_default" className="text-sm font-medium">Set as Default TTS</label>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end">
        <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Settings
        </button>
      </div>
    </form>
  )
}
