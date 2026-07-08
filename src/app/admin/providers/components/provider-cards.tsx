"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Server, Database, Volume2, Mic, Settings, Activity, ArrowRight, Video, Cloud, CloudRain } from "lucide-react"
import { useRouter } from "next/navigation"
import { createProvider } from "../actions"
import { toast } from "sonner"

export function ProviderCards({ providers, type }: { providers: any[], type: string }) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await createProvider(type, formData.get("provider_name") as string)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Created! Redirecting to workspace...")
        router.push(`/admin/providers/${res.id}`)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getIcon = (providerName: string) => {
    const name = (providerName || "").toLowerCase()
    if (name.includes("openrouter") || type === 'llm') return <Server className="h-8 w-8 text-indigo-500" />
    if (name.includes("elevenlabs") || type === 'tts') return <Volume2 className="h-8 w-8 text-blue-500" />
    if (name.includes("whisper") || type === 'subtitle') return <Mic className="h-8 w-8 text-violet-500" />
    if (type === 'storage') return <Cloud className="h-8 w-8 text-sky-500" />
    return <Database className="h-8 w-8 text-slate-500" />
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(providers || []).map((p) => (
          <div 
            key={p.id} 
            className="group relative border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col"
          >
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  {getIcon(p.provider_name)}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {p.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-1">{p.provider_name || 'Unnamed Provider'}</h3>
              <div className="flex items-center gap-2 mt-4 text-sm capitalize">
                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                  <span className={`h-2.5 w-2.5 rounded-full ${p.health_status === 'healthy' ? 'bg-green-500' : p.health_status === 'warning' ? 'bg-yellow-500' : p.health_status === 'offline' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                  {p.health_status}
                </span>
                {p.is_default && (
                  <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">Default</span>
                )}
              </div>
            </div>
            <div className="border-t bg-slate-50 dark:bg-slate-800/50 p-4">
              <button 
                onClick={() => router.push(`/admin/providers/${p.id}`)}
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Configure Workspace
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        <div 
          onClick={() => setIsAdding(true)}
          className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all cursor-pointer min-h-[220px]"
        >
          <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
            <Plus className="h-6 w-6" />
          </div>
          <p className="font-semibold">Add New Provider</p>
          <p className="text-xs mt-1 opacity-70 text-center">Create a new {type.toUpperCase()} integration</p>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsAdding(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 overflow-hidden"
            >
              <h2 className="text-2xl font-bold mb-2">Create {type.toUpperCase()} Provider</h2>
              <p className="text-slate-500 text-sm mb-6">Initialize a new workspace. You will configure credentials in the next step.</p>
              
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Provider Name</label>
                  <input 
                    name="provider_name" 
                    required 
                    autoFocus
                    type="text" 
                    placeholder="e.g. OpenAI, Azure TTS..."
                    className="w-full border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2.5 border rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex justify-center items-center gap-2">
                    {isSubmitting && <Activity className="h-4 w-4 animate-spin" />}
                    Create Workspace
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
