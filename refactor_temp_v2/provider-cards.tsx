"use client"

import { Server, Database, Volume2, Mic, ArrowRight, Cloud, Settings, Activity } from "lucide-react"
import { useRouter } from "next/navigation"

export function ProviderCards({ providers, type }: { providers: any[], type: string }) {
  const router = useRouter()

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
      {(providers || []).map((p) => {
        const credentials = p.credentials || []
        const activeCount = credentials.filter((c: any) => c.is_active).length
        const totalCount = credentials.length
        
        // Find default credential or highest priority to show primary health
        const primaryCred = credentials.find((c: any) => c.is_default) || credentials[0]
        const healthStatus = primaryCred?.health_status || 'unknown'

        return (
          <div 
            key={p.provider_key} 
            className="group relative border rounded-xl overflow-hidden shadow-sm transition-all flex flex-col bg-white dark:bg-slate-900 hover:shadow-md"
          >
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  {getIcon(p.provider_key)}
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-1">{p.provider_name}</h3>
              <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{p.description}</p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300 capitalize">
                  <span className={`h-2.5 w-2.5 rounded-full ${healthStatus === 'healthy' ? 'bg-green-500' : healthStatus === 'warning' ? 'bg-yellow-500' : healthStatus === 'offline' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                  {healthStatus}
                </span>
                <span className="font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                  {activeCount} / {totalCount} Active Keys
                </span>
              </div>
            </div>
            
            <div className="border-t bg-slate-50 dark:bg-slate-800/50 p-4">
              <button 
                onClick={() => router.push(`/admin/providers/${p.provider_key}`)}
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                Manage Credentials
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
      
      {providers.length === 0 && (
        <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed rounded-xl">
          <p>System provider not found or missing from database seed.</p>
        </div>
      )}
    </div>
  )
}
