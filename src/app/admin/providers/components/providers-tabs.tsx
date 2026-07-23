"use client"

import { useState } from "react"
import { ProviderCards } from "./provider-cards"

export function ProvidersTabs({ initialData }: { initialData: any[] }) {
  const [activeTab, setActiveTab] = useState("llm")
  
  const safeData = initialData || []
  
  // Group predefined system providers by tab
  const llmProviders = safeData.filter(p => p.provider_key === "openrouter")
  const ttsProviders = safeData.filter(p => p.provider_key === "elevenlabs")
  const storageProviders = safeData.filter(p => p.provider_key === "cloudflare_r2")
  const subtitleProviders = safeData.filter(p => p.provider_key === "whisper")
  const renderProviders = safeData.filter(p => p.provider_key === "render_worker")

  const tabs = [
    { id: "llm", label: "LLM" },
    { id: "tts", label: "TTS" },
    { id: "storage", label: "Storage" },
    { id: "subtitle", label: "Subtitle" }
  ]

  return (
    <div className="w-full">
      <div className="mb-4 flex space-x-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {activeTab === "llm" && <ProviderCards providers={llmProviders} type="llm" />}
      {activeTab === "tts" && <ProviderCards providers={ttsProviders} type="tts" />}
      {activeTab === "storage" && <ProviderCards providers={storageProviders} type="storage" />}
      {activeTab === "subtitle" && <ProviderCards providers={subtitleProviders} type="subtitle" />}
    </div>
  )
}
