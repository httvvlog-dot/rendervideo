"use client"

import { useState } from "react"
import { saveCredential } from "../../../actions"
import { toast } from "sonner"
import { Activity } from "lucide-react"
import { SecretInput } from "../../../components/secret-input"

export function ElevenLabsForm({ providerId, credential, onSuccess }: { providerId: string, credential?: any, onSuccess: () => void }) {
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
        default_voice_id: formData.get("default_voice_id"),
        default_model_id: formData.get("default_model_id") || "eleven_multilingual_v2"
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
          placeholder="e.g. ElevenLabs Voice Production"
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
          <SecretInput name="apiKey" defaultValue={config.apiKey} placeholder="xi-..." />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fallback Voice ID (Optional)</label>
          <input 
            type="text" 
            name="default_voice_id" 
            defaultValue={config.default_voice_id}
            placeholder="e.g. 21m00Tcm4TlvDq8ikWAM (Rachel)"
            className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Default Model <span className="text-red-500">*</span></label>
          <select 
            name="default_model_id" 
            defaultValue={config.default_model_id || "eleven_multilingual_v2"}
            className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="eleven_multilingual_v2">Eleven Multilingual v2 (Best for VN)</option>
            <option value="eleven_flash_v2_5">Eleven Flash v2.5 (Fastest)</option>
            <option value="eleven_monolingual_v1">Eleven Monolingual v1 (English)</option>
            <option value="eleven_turbo_v2_5">Eleven Turbo v2.5 (Low latency)</option>
          </select>
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
