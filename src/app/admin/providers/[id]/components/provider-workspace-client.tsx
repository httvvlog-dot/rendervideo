"use client"

import { useState } from "react"
import { ArrowLeft, Server, Volume2, Mic, Cloud, Database, Plus, X } from "lucide-react"
import Link from "next/link"
import { CredentialCard } from "./credential-card"
import { OpenRouterForm } from "./forms/openrouter-form"
import { ElevenLabsForm } from "./forms/elevenlabs-form"
import { CloudflareR2Form } from "./forms/cloudflare-r2-form"
import { GenericForm } from "./forms/generic-form"

export function ProviderWorkspaceClient({ provider }: { provider: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCredential, setEditingCredential] = useState<any>(null)

  const credentials = provider?.credentials || []

  const getIcon = () => {
    const key = provider?.provider_key
    if (key === "openrouter") return <Server className="h-6 w-6 text-indigo-500" />
    if (key === "elevenlabs") return <Volume2 className="h-6 w-6 text-blue-500" />
    if (key === "whisper") return <Mic className="h-6 w-6 text-violet-500" />
    if (key === "cloudflare_r2") return <Cloud className="h-6 w-6 text-sky-500" />
    return <Database className="h-6 w-6 text-slate-500" />
  }

  const handleAddNew = () => {
    setEditingCredential(null)
    setIsModalOpen(true)
  }

  const handleEdit = (cred: any) => {
    setEditingCredential(cred)
    setIsModalOpen(true)
  }

  const renderConfigurationForm = () => {
    const key = provider?.provider_key
    // Pass provider_id so the form knows which provider this credential belongs to.
    const formProps = {
      providerId: provider?.id,
      credential: editingCredential,
      onSuccess: () => setIsModalOpen(false)
    }
    
    if (key === "openrouter") return <OpenRouterForm {...formProps} />
    if (key === "elevenlabs") return <ElevenLabsForm {...formProps} />
    if (key === "cloudflare_r2") return <CloudflareR2Form {...formProps} />
    return <GenericForm {...formProps} />
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/providers"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-white dark:bg-slate-800 border rounded-lg shadow-sm">
            {getIcon()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {provider?.provider_name}
            </h1>
            <p className="text-sm text-slate-500">{provider?.description}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto pb-12">
        <div className="max-w-4xl space-y-4">
          
          {provider?.provider_key === 'elevenlabs' && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Voice Management (Sprint 5.1)</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Sync all voices from ElevenLabs, import by Voice ID, and manage display names.</p>
              </div>
              <Link 
                href="/admin/providers/elevenlabs/voices"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Manage Voices
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">API Credentials & Configurations</h2>
            <button 
              onClick={handleAddNew}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Configuration
            </button>
          </div>

          {credentials.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <Database className="h-8 w-8 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500 font-medium">No credentials configured</p>
              <p className="text-slate-400 text-sm mt-1 mb-4">You need at least one API key or configuration to use this provider.</p>
              <button 
                onClick={handleAddNew}
                className="px-4 py-2 bg-white dark:bg-slate-700 border hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Create the first credential
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {credentials.map((cred: any) => (
                <CredentialCard 
                  key={cred.id} 
                  credential={cred} 
                  providerKey={provider?.provider_key} 
                  onEdit={handleEdit} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{editingCredential ? 'Edit Credential' : 'Add New Credential'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {renderConfigurationForm()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
