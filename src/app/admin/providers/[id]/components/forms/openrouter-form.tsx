"use client"

import { useState } from "react"
import { saveProvider } from "../../../../actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function OpenRouterForm({ provider }: { provider: any }) {
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
          defaultModel: formData.get("defaultModel"),
          fallbackModel: formData.get("fallbackModel"),
        }
      }
      const res = await saveProvider(payload)
      if (res && res.error) toast.error(res.error)
      else toast.success("OpenRouter config saved successfully")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 border rounded-xl p-6">
      <h3 className="text-lg font-semibold border-b pb-4">OpenRouter Settings</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">API Key</label>
          <input 
            name="apiKey"
            type="password" 
            className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800" 
            placeholder={provider._hasSecret ? "•••••••••••••••• (Set)" : "Enter OpenRouter API Key"} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Default Model</label>
            <input 
              name="defaultModel"
              type="text" 
              defaultValue={config.defaultModel || ""}
              className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800" 
              placeholder="e.g. openai/gpt-4o" 
            />
            <p className="text-xs text-slate-500 mt-1">Will be fetched dynamically in Phase C.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fallback Model</label>
            <input 
              name="fallbackModel"
              type="text" 
              defaultValue={config.fallbackModel || ""}
              className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800" 
              placeholder="e.g. anthropic/claude-3-haiku" 
            />
          </div>
        </div>

        <div className="flex gap-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_active" id="is_active" defaultChecked={provider.is_active} className="rounded" />
            <label htmlFor="is_active" className="text-sm font-medium">Active</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_default" id="is_default" defaultChecked={provider.is_default} className="rounded" />
            <label htmlFor="is_default" className="text-sm font-medium">Set as Default LLM</label>
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
