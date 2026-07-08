"use client"

import { useState } from "react"
import { Server, Database, Volume2, Mic, ArrowRight, Cloud, Settings, Power, PowerOff, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toggleProvider } from "../actions"
import { toast } from "sonner"

export function ProviderCards({ providers, type }: { providers: any[], type: string }) {
  const router = useRouter()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleToggle = async (e: React.MouseEvent, providerKey: string, currentStatus: boolean) => {
    e.stopPropagation()
    setTogglingId(providerKey)
    try {
      const res = await toggleProvider(providerKey)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Provider ${res.is_active ? 'enabled' : 'disabled'}`)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  const getIcon = (providerKey: string) => {
    if (providerKey === "openrouter") return <Server className="h-8 w-8 text-indigo-500" />
    if (providerKey === "elevenlabs") return <Volume2 className="h-8 w-8 text-blue-500" />
    if (providerKey === "whisper") return <Mic className="h-8 w-8 text-violet-500" />
    if (providerKey === "cloudflare_r2") return <Cloud className="h-8 w-8 text-sky-500" />
    if (providerKey === "render_worker") return <Settings className="h-8 w-8 text-orange-500" />
    return <Database className="h-8 w-8 text-slate-500" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(providers || []).map((p) => (
        <div 
          key={p.provider_key} 
          className={`group relative border rounded-xl overflow-hidden shadow-sm transition-all flex flex-col ${!p.is_active ? 'bg-slate-50 dark:bg-slate-900/50 opacity-75' : 'bg-white dark:bg-slate-900 hover:shadow-md'}`}
        >
          <div className="p-6 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                {getIcon(p.provider_key)}
              </div>
              
              <button 
                onClick={(e) => handleToggle(e, p.provider_key, p.is_active)}
                disabled={togglingId === p.provider_key}
                className={`p-1.5 rounded-full transition-colors ${
                  p.is_active 
                    ? 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50' 
                    : 'text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
                }`}
                title={p.is_active ? "Disable Provider" : "Enable Provider"}
              >
                {togglingId === p.provider_key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : p.is_active ? (
                  <Power className="h-4 w-4" />
                ) : (
                  <PowerOff className="h-4 w-4" />
                )}
              </button>
            </div>
            
            <h3 className="text-xl font-bold mb-1">{p.provider_name}</h3>
            
            <div className="flex items-center gap-2 mt-4 text-sm capitalize">
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <span className={`h-2.5 w-2.5 rounded-full ${p.health_status === 'healthy' ? 'bg-green-500' : p.health_status === 'warning' ? 'bg-yellow-500' : p.health_status === 'offline' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                {p.health_status}
              </span>
              <span className="ml-auto text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {p.provider_key}
              </span>
            </div>
          </div>
          
          <div className="border-t bg-slate-50 dark:bg-slate-800/50 p-4">
            <button 
              onClick={() => router.push(`/admin/providers/${p.provider_key}`)}
              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              Configure Workspace
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      
      {providers.length === 0 && (
        <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed rounded-xl">
          <p>System provider not found or missing from database seed.</p>
        </div>
      )}
    </div>
  )
}
