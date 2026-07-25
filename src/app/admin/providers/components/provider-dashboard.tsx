"use client"

import { useEffect, useState } from "react"
import { getProviderAnalytics } from "../actions"
import { Activity, Server, Clock, CheckCircle2, AlertTriangle, XCircle, DollarSign, BarChart3 } from "lucide-react"

export function ProviderDashboard() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      const res = await getProviderAnalytics()
      setData(res)
      setLoading(false)
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        <Activity className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Summary Metrics
  const totalRequests = data.reduce((acc, curr) => acc + curr.requests, 0)
  const totalCost = data.reduce((acc, curr) => acc + curr.cost, 0)
  const activeProviders = data.filter(d => d.activeCredentials > 0).length

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <BarChart3 className="h-5 w-5" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Total Requests</h3>
          </div>
          <p className="text-3xl font-bold">{totalRequests.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">This Month</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-green-600 mb-2">
            <DollarSign className="h-5 w-5" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Total Cost</h3>
          </div>
          <p className="text-3xl font-bold">${totalCost.toFixed(2)}</p>
          <p className="text-sm text-slate-500 mt-1">Estimated This Month</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-purple-600 mb-2">
            <Server className="h-5 w-5" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Active Providers</h3>
          </div>
          <p className="text-3xl font-bold">{activeProviders} <span className="text-lg font-normal text-slate-500">/ {data.length}</span></p>
          <p className="text-sm text-slate-500 mt-1">Configured and Running</p>
        </div>
      </div>

      {/* Provider Details Table */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-800/50">
          <h2 className="font-semibold">Provider Health & Usage</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-sm text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                <th className="px-6 py-4 font-medium">Provider</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Requests</th>
                <th className="px-6 py-4 font-medium">Cost</th>
                <th className="px-6 py-4 font-medium">Avg Latency</th>
                <th className="px-6 py-4 font-medium">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((provider) => (
                <tr key={provider.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{provider.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded text-xs uppercase font-semibold">
                      {provider.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">{provider.requests.toLocaleString()}</td>
                  <td className="px-6 py-4">${provider.cost.toFixed(4)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {provider.latency > 0 ? `${provider.latency} ms` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {provider.activeCredentials === 0 ? (
                      <span className="flex items-center gap-1.5 text-slate-400 text-sm">
                        <XCircle className="h-4 w-4" /> Not Configured
                      </span>
                    ) : provider.successRate >= 99 ? (
                      <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4" /> {provider.successRate}%
                      </span>
                    ) : provider.successRate > 50 ? (
                      <span className="flex items-center gap-1.5 text-yellow-600 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4" /> {provider.successRate}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                        <XCircle className="h-4 w-4" /> {provider.successRate}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
