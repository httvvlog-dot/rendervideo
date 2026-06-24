"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MoreHorizontal, Plus, Settings2, Trash2 } from "lucide-react"

export function ProviderTable({ providers, type }: { providers: any[], type: string }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null)

  const openSheet = (provider: any = null) => {
    setSelectedProvider(provider)
    setIsSheetOpen(true)
  }

  const closeSheet = () => {
    setIsSheetOpen(false)
    setTimeout(() => setSelectedProvider(null), 300)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold capitalize">{type} Providers</h2>
        <button 
          onClick={() => openSheet()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Health</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {providers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No {type} providers configured yet.
                </td>
              </tr>
            ) : (
              providers.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    {p.provider_name}
                    {p.is_default && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-semibold">Default</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {p.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${p.health_status === 'healthy' ? 'bg-green-500' : p.health_status === 'warning' ? 'bg-yellow-500' : p.health_status === 'offline' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                      {p.health_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.priority}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openSheet(p)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                      <Settings2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Panel (Sheet alternative) */}
      <AnimatePresence>
        {isSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-950 shadow-2xl border-l z-50 overflow-y-auto flex flex-col"
            >
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">{selectedProvider ? 'Edit Provider' : 'Add Provider'}</h3>
                <p className="text-sm text-slate-500 mt-1">Configure API keys and model defaults.</p>
              </div>
              
              <div className="p-6 flex-1">
                {/* Form placeholder */}
                <form className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Provider Name</label>
                    <input type="text" className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" defaultValue={selectedProvider?.provider_name || ''} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Key</label>
                    <input 
                      type="password" 
                      className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" 
                      placeholder={selectedProvider?._hasSecret ? "•••••••••••••••• (Set)" : "Enter API Key"} 
                    />
                    <p className="text-xs text-slate-500">API keys are securely masked and never sent to the browser.</p>
                  </div>
                  
                  {/* Dynamic fields based on type would go here */}
                  {type === 'llm' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Default Model</label>
                        <input type="text" className="w-full border rounded-md px-3 py-2 text-sm bg-transparent" defaultValue={selectedProvider?.config_json?.defaultModel || ''} />
                      </div>
                    </>
                  )}
                </form>
              </div>
              
              <div className="p-6 border-t bg-slate-50 dark:bg-slate-900 flex justify-between">
                {selectedProvider && (
                  <button className="text-red-600 hover:text-red-700 p-2"><Trash2 className="h-5 w-5" /></button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button onClick={closeSheet} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Save Changes</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
