"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Check, ChevronDown, Bot, Loader2 } from "lucide-react"

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

interface OpenRouterModelSelectorProps {
  models: OpenRouterModel[];
  selectedModelId: string;
  onSelect: (modelId: string) => void;
  isLoading: boolean;
}

export function OpenRouterModelSelector({ models, selectedModelId, onSelect, isLoading }: OpenRouterModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.provider.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group models by provider
  const groupedModels = filteredModels.reduce((acc, model) => {
    const p = model.provider || "other";
    if (!acc[p]) acc[p] = [];
    acc[p].push(model);
    return acc;
  }, {} as Record<string, OpenRouterModel[]>);

  // Define priority sorting for providers
  const priorityOrder = ["google", "openai", "anthropic", "deepseek", "meta", "mistral", "cohere"];
  const sortedProviders = Object.keys(groupedModels).sort((a, b) => {
    const idxA = priorityOrder.indexOf(a);
    const idxB = priorityOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const selectedModel = models.find(m => m.id === selectedModelId)

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center truncate mr-2 w-full">
          {isLoading ? (
            <span className="flex items-center text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading models...
            </span>
          ) : selectedModel ? (
            <span className="flex flex-col truncate w-full">
              <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{selectedModel.name}</span>
              <span className="text-[10px] text-slate-500 font-mono truncate">{selectedModel.id}</span>
            </span>
          ) : (
            <span className="text-sm text-slate-500">Select a model...</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-80 flex flex-col">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search models..." 
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          <div className="overflow-y-auto p-1">
            {models.length === 0 && !isLoading ? (
              <div className="p-4 text-center text-sm text-slate-500 flex flex-col items-center">
                <Bot className="w-8 h-8 mb-2 opacity-20" />
                <p>No models loaded.</p>
                <p className="text-xs mt-1">Please enter an API key and click Load Models.</p>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No models match your search.</div>
            ) : (
              sortedProviders.map(provider => (
                <div key={provider} className="mb-2">
                  <div className="px-2 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/50 sticky top-0">
                    {provider}
                  </div>
                  {groupedModels[provider].map(model => (
                    <div 
                      key={model.id}
                      className={`px-2 py-2 flex items-start justify-between cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedModelId === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      onClick={() => {
                        onSelect(model.id);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="flex flex-col truncate pr-4">
                        <span className={`text-sm truncate ${selectedModelId === model.id ? 'font-medium text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {model.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{model.id}</span>
                        {model.contextLength && (
                          <span className="text-[10px] text-slate-400 mt-0.5">Ctx: {(model.contextLength / 1000).toFixed(0)}k</span>
                        )}
                      </div>
                      {selectedModelId === model.id && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
