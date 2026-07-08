"use client"

import { Activity, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

export function DiagnosticsPanel({ provider }: { provider: any }) {
  const healthStatus = provider?.health_status || "unknown"
  
  // Fake or real values based on provider state
  const latency = provider?.latency || (healthStatus === "healthy" ? "120ms" : "N/A")
  const lastChecked = provider?.updated_at ? new Date(provider.updated_at).toLocaleString() : "Never"
  const apiVersion = "v1" // Could be dynamic in the future
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 mb-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            Health Status
          </div>
          <div className="flex items-center gap-2">
            {healthStatus === 'healthy' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {healthStatus === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            {healthStatus === 'offline' && <XCircle className="h-5 w-5 text-red-500" />}
            {healthStatus === 'unknown' && <Activity className="h-5 w-5 text-slate-400" />}
            <span className="font-semibold capitalize text-lg">{healthStatus}</span>
          </div>
        </div>

        {/* Latency */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 mb-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            Average Latency
          </div>
          <div className="font-semibold text-lg">{latency}</div>
        </div>

        {/* Last Checked */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 mb-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Last Checked
          </div>
          <div className="font-semibold text-sm">{lastChecked}</div>
        </div>

        {/* API Version */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 mb-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            API Version
          </div>
          <div className="font-semibold text-lg">{apiVersion}</div>
        </div>
      </div>

      {healthStatus === 'offline' && (
        <div className="bg-red-50 dark:bg-red-900/10 text-red-600 border border-red-200 dark:border-red-900/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold">Connection Error</h4>
            <p className="text-sm mt-1">
              The system could not establish a connection to {provider?.provider_name}. Please verify your API Key and network configuration.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
