"use client"

import { useState, useEffect } from "react"
import { saveCredential } from "../../../actions"
import { getOpenRouterModels } from "../../../actions"
import { toast } from "sonner"
import { Activity, RefreshCw } from "lucide-react"
import { SecretInput } from "../../../components/secret-input"
import { OpenRouterModelSelector, OpenRouterModel } from "./openrouter-model-selector"

export function OpenRouterForm({ providerId, credential, onSuccess }: { providerId: string, credential?: any, onSuccess: () => void }) {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [models, setModels] = useState<OpenRouterModel[]>([])
  
  const config = credential?.config_json || {}
  
  const initialDefaultModel = config.default_model || config.defaultModel || ""
  const [selectedModel, setSelectedModel] = useState<string>(initialDefaultModel)
  const [apiKeyInput, setApiKeyInput] = useState<string>(config.apiKey || "")

  // Initial load if we have a saved credential
  useEffect(() => {
    if (credential?.id) {
      loadModels(credential.id, undefined)
    }
  }, [credential?.id])

  const loadModels = async (credId?: string, keyOverride?: string) => {
    setIsLoadingModels(true)
    try {
      const res = await getOpenRouterModels(credId, keyOverride)
      if (res.error) {
        toast.error(res.error)
      } else if (res.models) {
        setModels(res.models)
        if (res.models.length > 0) {
          toast.success(`Loaded ${res.models.length} models`)
        }
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleLoadModelsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!apiKeyInput && !credential?.id) {
      toast.error("Please enter an API Key first")
      return
    }
    // Only pass the apiKey if we don't have a saved credential, or if the user typed a new one.
    // If the input is '••••••••••••••••', it means the key is unchanged and safely stored in the backend.
    const keyToPass = apiKeyInput === "••••••••••••••••" || !apiKeyInput ? undefined : apiKeyInput;
    loadModels(credential?.id, keyToPass)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedModel) {
      toast.error("Please select a Default Model")
      return
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
        siteUrl: formData.get("siteUrl"),
        siteName: formData.get("siteName"),
        default_model: selectedModel
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
          <div className="flex space-x-2">
            <div className="flex-grow">
              <SecretInput 
                name="apiKey" 
                defaultValue={config.apiKey} 
                placeholder="sk-or-v1-..." 
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </div>
            <button 
              type="button" 
              onClick={handleLoadModelsClick}
              disabled={isLoadingModels}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center shrink-0"
            >
              {isLoadingModels ? <Activity className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Load Models
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <label className="block text-sm font-medium mb-2">Default Model <span className="text-red-500">*</span></label>
          <OpenRouterModelSelector 
            models={models} 
            selectedModelId={selectedModel} 
            onSelect={setSelectedModel} 
            isLoading={isLoadingModels} 
          />
          <p className="text-[10px] text-slate-500 mt-2">
            Load models using the API key, then search and select a model.
          </p>
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
