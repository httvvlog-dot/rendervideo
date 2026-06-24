"use client"

import { useState } from "react"
import { ProviderTable } from "./provider-table"

export function ProvidersTabs({ initialData }: { initialData: any[] }) {
  const [activeTab, setActiveTab] = useState("llm")
  
  const llmProviders = initialData.filter(p => p.provider_type === "llm")
  const ttsProviders = initialData.filter(p => p.provider_type === "tts")
  const storageProviders = initialData.filter(p => p.provider_type === "storage")
  const subtitleProviders = initialData.filter(p => p.provider_type === "subtitle")

  const tabs = [
    { id: "llm", label: "LLM" },
    { id: "tts", label: "TTS" },
    { id: "storage", label: "Storage" },
    { id: "subtitle", label: "Subtitle" }
  ]

  return (
    <div className="w-full">
      <div className="mb-4 flex space-x-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {activeTab === "llm" && <ProviderTable providers={llmProviders} type="llm" />}
      {activeTab === "tts" && <ProviderTable providers={ttsProviders} type="tts" />}
      {activeTab === "storage" && <ProviderTable providers={storageProviders} type="storage" />}
      {activeTab === "subtitle" && <ProviderTable providers={subtitleProviders} type="subtitle" />}
    </div>
  )
}
