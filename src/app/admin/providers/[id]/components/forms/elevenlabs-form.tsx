"use client"

import { useState, useRef } from "react"
import { saveCredential, syncProviderModels, testProviderCredential } from "../../../actions"
import { toast } from "sonner"
import { Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { SecretInput } from "../../../components/secret-input"

export function ElevenLabsForm({ providerId, credential, onSuccess, providerModels = [] }: { providerId: string, credential?: any, onSuccess: () => void, providerModels?: any[] }) {
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  
  const formRef = useRef<HTMLFormElement>(null)
  const config = credential?.config_json || {}

  const handleTest = async () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const apiKey = formData.get("apiKey") as string;
    
    if (!apiKey) {
      toast.error("Please enter an API Key to test");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      // Simulate form payload structure
      const testConfig = { apiKey };
      const res = await testProviderCredential("elevenlabs", testConfig, credential?.id);
      
      if (res.error) {
        toast.error(res.error);
      } else if (res.result) {
        setTestResult(res.result);
        if (res.result.status === "VALID" && res.result.runtimeStatus === "HEALTHY") {
          toast.success("Connection valid!");
        } else if (res.result.status === "INVALID") {
          toast.error("Invalid API Key format");
        } else {
          toast.warning("Key format is valid, but runtime test failed");
        }
      } else {
        toast.error("An unknown error occurred during testing.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsTesting(false);
    }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Prevent save if testing or if the format is explicitly invalid
    if (testResult?.status === "INVALID") {
      toast.error("Cannot save invalid credential format.");
      return;
    }

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

  const handleSyncModels = async () => {
    setIsSyncing(true)
    try {
      const res = await syncProviderModels("elevenlabs")
      if (res.error) toast.error(res.error)
      else toast.success("Models synced successfully")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-5">
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
          <div className="flex gap-2">
            <div className="flex-1">
              <SecretInput name="apiKey" defaultValue={config.apiKey} placeholder="sk_..." />
            </div>
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border whitespace-nowrap"
            >
              {isTesting && <Activity className="w-4 h-4 animate-spin" />}
              Test Connection
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg border text-sm ${
            testResult.status === "VALID" && testResult.runtimeStatus === "HEALTHY" ? "bg-green-50 border-green-200 dark:bg-green-900/20" :
            testResult.status === "INVALID" ? "bg-red-50 border-red-200 dark:bg-red-900/20" : 
            "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20"
          }`}>
            <div className="flex items-center gap-2 font-medium mb-2">
              {testResult.status === "VALID" && testResult.runtimeStatus === "HEALTHY" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
              {testResult.status === "INVALID" && <XCircle className="w-4 h-4 text-red-600" />}
              {testResult.status === "VALID" && testResult.runtimeStatus !== "HEALTHY" && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
              
              <span>
                {testResult.status === "INVALID" ? "Invalid Format" : 
                 testResult.runtimeStatus === "HEALTHY" ? "Connection Successful" : 
                 `Runtime Issue: ${testResult.runtimeStatus}`}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs opacity-80">
              <div><span className="font-semibold">Provider:</span> {testResult.provider}</div>
              <div><span className="font-semibold">Latency:</span> {testResult.latency}ms</div>
              {testResult.message && <div className="col-span-2"><span className="font-semibold">Message:</span> {testResult.message}</div>}
              {testResult.capabilities && <div className="col-span-2"><span className="font-semibold">Capabilities:</span> {testResult.capabilities.join(", ")}</div>}
            </div>
          </div>
        )}

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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Default Model <span className="text-red-500">*</span></label>
            {credential && (
              <button type="button" onClick={handleSyncModels} disabled={isSyncing} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Models"}
              </button>
            )}
          </div>
          <select 
            name="default_model_id" 
            defaultValue={config.default_model_id || "eleven_multilingual_v2"}
            className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {providerModels.length > 0 ? (
              providerModels.map(m => (
                <option key={m.model_id} value={m.model_id}>{m.name || m.model_id}</option>
              ))
            ) : (
              <>
                <option value="eleven_multilingual_v2">Eleven Multilingual v2</option>
                <option value="eleven_turbo_v2_5">Eleven Turbo v2.5</option>
                <option value="eleven_v3">Eleven v3</option>
              </>
            )}
          </select>
          {providerModels.length === 0 && credential && (
            <p className="text-xs text-slate-500 mt-1">Click "Sync Models" above to fetch the latest available models.</p>
          )}
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button 
          type="submit" 
          disabled={isSaving || testResult?.status === "INVALID"}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving && <Activity className="h-4 w-4 animate-spin" />}
          Save Credential
        </button>
      </div>
    </form>
  )
}
