"use client"

import { useState } from "react"
import { ArrowLeft, Server, Volume2, Mic, Cloud, Database, Activity, LayoutGrid, TerminalSquare, PieChart, Box } from "lucide-react"
import Link from "next/link"
import { OpenRouterForm } from "./forms/openrouter-form"
import { ElevenLabsForm } from "./forms/elevenlabs-form"
import { CloudflareR2Form } from "./forms/cloudflare-r2-form"
import { GenericForm } from "./forms/generic-form"
import { DiagnosticsPanel } from "../../../components/diagnostics-panel"

export function ProviderWorkspaceClient({ provider }: { provider: any }) {
  const [activeTab, setActiveTab] = useState("general")

  const getIcon = () => {
    const key = provider?.provider_key
    if (key === "openrouter") return <Server className="h-6 w-6 text-indigo-500" />
    if (key === "elevenlabs") return <Volume2 className="h-6 w-6 text-blue-500" />
    if (key === "whisper") return <Mic className="h-6 w-6 text-violet-500" />
    if (key === "cloudflare_r2") return <Cloud className="h-6 w-6 text-sky-500" />
    return <Database className="h-6 w-6 text-slate-500" />
  }

  const renderConfigurationForm = () => {
    const key = provider?.provider_key
    if (key === "openrouter") return <OpenRouterForm provider={provider} />
    if (key === "elevenlabs") return <ElevenLabsForm provider={provider} />
    if (key === "cloudflare_r2") return <CloudflareR2Form provider={provider} />
    return <GenericForm provider={provider} />
  }

  const getTabs = () => {
    const key = provider?.provider_key
    const baseTabs = [
      { id: "general", label: "General", icon: <Settings className="h-4 w-4" /> },
    ]

    if (key === "openrouter") {
      baseTabs.push({ id: "models", label: "Models", icon: <Box className="h-4 w-4" /> })
    } else if (key === "elevenlabs") {
      baseTabs.push({ id: "voices", label: "Voices", icon: <Volume2 className="h-4 w-4" /> })
    } else if (key === "cloudflare_r2") {
      baseTabs.push({ id: "bucket", label: "Bucket", icon: <Database className="h-4 w-4" /> })
    }

    baseTabs.push(
      { id: "diagnostics", label: "Diagnostics", icon: <Activity className="h-4 w-4" /> },
      { id: "usage", label: "Usage", icon: <PieChart className="h-4 w-4" /> },
      { id: "logs", label: "Logs", icon: <TerminalSquare className="h-4 w-4" /> }
    )

    return baseTabs
  }

  const tabs = getTabs()

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
              {provider?.provider_name}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${provider?.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                {provider?.is_active ? 'Active' : 'Disabled'}
              </span>
            </h1>
            <p className="text-sm text-slate-500 capitalize">{provider?.provider_type} System Provider</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex space-x-6 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl pb-12">
          {activeTab === "general" && renderConfigurationForm()}
          {activeTab === "diagnostics" && <DiagnosticsPanel provider={provider} />}
          
          {(activeTab === "models" || activeTab === "voices" || activeTab === "bucket") && (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
              <LayoutGrid className="h-8 w-8 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500 font-medium">Coming Soon</p>
              <p className="text-slate-400 text-sm mt-1">This specific configuration module is under development.</p>
            </div>
          )}

          {activeTab === "usage" && (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
              <PieChart className="h-8 w-8 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500 font-medium">Usage Metrics</p>
              <p className="text-slate-400 text-sm mt-1">API consumption and billing metrics will appear here.</p>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
              <TerminalSquare className="h-8 w-8 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500 font-medium">Audit Logs</p>
              <p className="text-slate-400 text-sm mt-1">API request logs and error traces will be displayed here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Temporary imports since Settings is not exported from lucide-react directly in some versions,
// or I can just import it at the top. I added it at the top.
