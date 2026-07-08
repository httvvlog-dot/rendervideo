"use client"

import { useState } from "react"
import { ArrowLeft, Server, Volume2, Mic, Cloud, Database, Activity, TerminalSquare, LayoutGrid } from "lucide-react"
import Link from "next/link"
import { OpenRouterForm } from "./forms/openrouter-form"
import { ElevenLabsForm } from "./forms/elevenlabs-form"
import { CloudflareR2Form } from "./forms/cloudflare-r2-form"
import { GenericForm } from "./forms/generic-form"

export function ProviderWorkspaceClient({ provider }: { provider: any }) {
  const [activeTab, setActiveTab] = useState("configuration")

  const getIcon = () => {
    const name = provider.provider_name.toLowerCase()
    const type = provider.provider_type
    if (name.includes("openrouter") || type === 'llm') return <Server className="h-6 w-6 text-indigo-500" />
    if (name.includes("elevenlabs") || type === 'tts') return <Volume2 className="h-6 w-6 text-blue-500" />
    if (name.includes("whisper") || type === 'subtitle') return <Mic className="h-6 w-6 text-violet-500" />
    if (type === 'storage') return <Cloud className="h-6 w-6 text-sky-500" />
    return <Database className="h-6 w-6 text-slate-500" />
  }

  const renderConfigurationForm = () => {
    const name = provider.provider_name.toLowerCase()
    if (name.includes("openrouter")) return <OpenRouterForm provider={provider} />
    if (name.includes("elevenlabs")) return <ElevenLabsForm provider={provider} />
    if (name.includes("cloudflare") || name.includes("r2")) return <CloudflareR2Form provider={provider} />
    return <GenericForm provider={provider} />
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-slate-800 border rounded-lg shadow-sm">
            {getIcon()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {provider.provider_name}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${provider.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                {provider.is_active ? 'Active' : 'Disabled'}
              </span>
            </h1>
            <p className="text-sm text-slate-500 capitalize">{provider.provider_type} Provider</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab("configuration")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "configuration"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Settings className="h-4 w-4" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "diagnostics"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Activity className="h-4 w-4" />
            Diagnostics
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "logs"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <TerminalSquare className="h-4 w-4" />
            Logs
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === "configuration" && (
          <div className="max-w-3xl">
            {renderConfigurationForm()}
          </div>
        )}
        {activeTab === "diagnostics" && (
          <div className="max-w-3xl p-8 border rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-center">
            <Activity className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold">Diagnostics Panel</h3>
            <p className="text-sm text-slate-500">To be implemented in Phase B.</p>
          </div>
        )}
        {activeTab === "logs" && (
          <div className="max-w-3xl p-8 border rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-center">
            <TerminalSquare className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold">Provider Logs</h3>
            <p className="text-sm text-slate-500">Coming soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}
