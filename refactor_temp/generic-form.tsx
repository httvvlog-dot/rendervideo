"use client"

import { useState } from "react"
import { saveProvider } from "../../actions"
import { toast } from "sonner"
import { Activity } from "lucide-react"
import { SecretInput } from "../../../components/secret-input"

export function GenericForm({ provider }: { provider: any }) {
  const [isSaving, setIsSaving] = useState(false)
  
  const config = provider?.config_json || {}

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      provider_key: provider.provider_key,
      is_active: formData.get("is_active") === "true",
      config: {
        apiKey: formData.get("apiKey"),
        endpoint: formData.get("endpoint")
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

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold capitalize">{provider?.provider_name} Configuration</h2>
          <p className="text-sm text-slate-500">Generic configuration parameters.</p>
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
          <label className="block text-sm font-medium mb-1">API Key (Optional)</label>
          <SecretInput name="apiKey" defaultValue={config.apiKey} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Custom Endpoint (Optional)</label>
          <input 
            type="url" 
            name="endpoint" 
            defaultValue={config.endpoint}
            placeholder="https://api.custom-provider.com/v1"
            className="w-full border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end">
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
