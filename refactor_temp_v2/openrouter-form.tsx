"use client"

import { useState } from "react"
import { saveCredential } from "../../../actions"
import { toast } from "sonner"
import { Activity } from "lucide-react"
import { SecretInput } from "../../../components/secret-input"

export function OpenRouterForm({ providerId, credential, onSuccess }: { providerId: string, credential?: any, onSuccess: () => void }) {
  const [isSaving, setIsSaving] = useState(false)
  
  const config = credential?.config_json || {}

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      id: credential?.id,
      provider_id: providerId,
      credential_name: formData.get("credential_name"),
      priority: parseInt(formData.get("priority") as string || "0", 10),
      is_active: formData.get("is_active") === "true",
      config: {
        apiKey: formData.get("apiKey"),
        siteUrl: formData.get("siteUrl"),
        siteName: formData.get("siteName")
      }
    }

    try {
      const res = await saveCredential(payload)
      if (res.error) toast.error(res.error)
      else {
        toast.success("Credential saved successfully")
        onSuccess()
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1">Credential Name <span className="text-red-500">*</span></label>
        <input 
          type="text" 
          name="credential_name" 
          defaultValue={credential?.credential_name}
          required
          placeholder="e.g. Gemini Production"
          className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <input 
            type="number" 
            name="priority" 
            defaultValue={credential?.priority ?? 0}
            className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[10px] text-slate-500 mt-1">Higher number = used first</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select 
            name="is_active" 
            defaultValue={credential?.is_active ?? true ? "true" : "false"}
            className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">API Key <span className="text-red-500">*</span></label>
          <SecretInput name="apiKey" defaultValue={config.apiKey} placeholder="sk-or-v1-..." />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Site URL (Optional)</label>
          <input 
            type="url" 
            name="siteUrl" 
            defaultValue={config.siteUrl}
            placeholder="https://your-domain.com"
            className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Site Name (Optional)</label>
          <input 
            type="text" 
            name="siteName" 
            defaultValue={config.siteName}
            placeholder="TaoVideo AI"
            className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button 
          type="submit" 
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 w-full justify-center"
        >
          {isSaving && <Activity className="h-4 w-4 animate-spin" />}
          Save Credential
        </button>
      </div>
    </form>
  )
}
