"use client"

import { useState } from "react"
import { saveProvider, testOpenRouterConnection } from "../../actions"
import { toast } from "sonner"
import { Activity, CheckCircle2, XCircle } from "lucide-react"
import { SecretInput } from "../../../components/secret-input"

export function OpenRouterForm({ provider }: { provider: any }) {
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  
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
        siteUrl: formData.get("siteUrl"),
        siteName: formData.get("siteName")
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

  const handleTest = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsTesting(true)
    setTestResult(null)
    
    const form = e.currentTarget.closest("form")
    const formData = new FormData(form!)
    const apiKey = formData.get("apiKey") as string

    try {
      const res = await testOpenRouterConnection(provider?.provider_key, apiKey)
      setTestResult(res)
      if (res.success) toast.success(`Connection successful! Latency: ${res.latency}ms`)
      else toast.error(`Connection failed: ${res.error}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold">OpenRouter Configuration</h2>
          <p className="text-sm text-slate-500">Configure your connection to OpenRouter API.</p>
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
          <SecretInput name="apiKey" defaultValue={config.apiKey} placeholder="sk-or-v1-..." />
          <p className="text-xs text-slate-500 mt-1">Get your API key from your OpenRouter account settings.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Site URL (Optional)</label>
          <input 
            type="url" 
            name="siteUrl" 
            defaultValue={config.siteUrl}
            placeholder="https://your-domain.com"
            className="w-full border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
          <p className="text-xs text-slate-500 mt-1">Required by OpenRouter for rankings.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Site Name (Optional)</label>
          <input 
            type="text" 
            name="siteName" 
            defaultValue={config.siteName}
            placeholder="TaoVideo AI"
            className="w-full border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {testResult && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${testResult.success ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/30' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900/30'}`}>
          {testResult.success ? <CheckCircle2 className="h-5 w-5 mt-0.5" /> : <XCircle className="h-5 w-5 mt-0.5" />}
          <div>
            <p className="font-medium text-sm">{testResult.success ? 'Connection Successful' : 'Connection Failed'}</p>
            {testResult.success ? (
              <p className="text-xs mt-1 opacity-80">Latency: {testResult.latency}ms • Models available: {testResult.modelCount}</p>
            ) : (
              <p className="text-xs mt-1 opacity-80">{testResult.error}</p>
            )}
          </div>
        </div>
      )}

      <div className="pt-4 border-t flex justify-end gap-3">
        <button 
          type="button" 
          onClick={handleTest}
          disabled={isTesting}
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {isTesting && <Activity className="h-4 w-4 animate-spin" />}
          Test Connection
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
