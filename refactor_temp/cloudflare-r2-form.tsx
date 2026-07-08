"use client"

import { useState } from "react"
import { saveProvider } from "../../actions"
import { toast } from "sonner"
import { Activity } from "lucide-react"
import { SecretInput } from "../../../components/secret-input"

export function CloudflareR2Form({ provider }: { provider: any }) {
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
        accountId: formData.get("accountId"),
        accessKeyId: formData.get("accessKeyId"),
        secretAccessKey: formData.get("secretAccessKey"),
        bucket: formData.get("bucket"),
        publicUrl: formData.get("publicUrl")
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
          <h2 className="text-lg font-semibold">Cloudflare R2 Configuration</h2>
          <p className="text-sm text-slate-500">Configure your S3-compatible storage connection.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-full">
          <label className="block text-sm font-medium mb-1">Account ID <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="accountId" 
            defaultValue={config.accountId}
            required
            placeholder="e.g. 1234567890abcdef1234567890abcdef"
            className="w-full border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Access Key ID <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="accessKeyId" 
            defaultValue={config.accessKeyId}
            required
            className="w-full border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Secret Access Key <span className="text-red-500">*</span></label>
          <SecretInput name="secretAccessKey" defaultValue={config.secretAccessKey} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bucket Name <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="bucket" 
            defaultValue={config.bucket}
            required
            placeholder="my-video-assets"
            className="w-full border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Public URL (Custom Domain)</label>
          <input 
            type="url" 
            name="publicUrl" 
            defaultValue={config.publicUrl}
            placeholder="https://cdn.yourdomain.com"
            className="w-full border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
          <p className="text-xs text-slate-500 mt-1">If configured, files will be served via this URL.</p>
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
