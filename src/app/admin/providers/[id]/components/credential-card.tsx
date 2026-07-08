"use client"

import { useState } from "react"
import { Activity, Edit, Trash2, Power, PowerOff, CheckCircle2, AlertTriangle, XCircle, Star } from "lucide-react"
import { toggleCredential, deleteCredential, setDefaultCredential, testCredentialConnection } from "../../../actions"
import { toast } from "sonner"

export function CredentialCard({ credential, providerKey, onEdit }: { credential: any, providerKey: string, onEdit: (c: any) => void }) {
  const [isToggling, setIsToggling] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleToggle = async () => {
    setIsToggling(true)
    const res = await toggleCredential(credential.id)
    if (res.error) toast.error(res.error)
    else toast.success(res.is_active ? "Enabled" : "Disabled")
    setIsToggling(false)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this credential?")) return
    setIsDeleting(true)
    const res = await deleteCredential(credential.id)
    if (res.error) toast.error(res.error)
    else toast.success("Deleted")
    setIsDeleting(false)
  }

  const handleSetDefault = async () => {
    const res = await setDefaultCredential(credential.id, credential.provider_id)
    if (res.error) toast.error(res.error)
    else toast.success("Set as Default")
  }

  const handleTest = async () => {
    setIsTesting(true)
    const res = await testCredentialConnection(credential.id)
    if (res.success) toast.success(`Healthy: ${res.latency}ms`)
    else toast.error(`Failed: ${res.error}`)
    setIsTesting(false)
  }

  return (
    <div className={`border rounded-xl p-4 transition-all ${!credential.is_active ? 'opacity-60 bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-lg">{credential.credential_name}</h4>
            {credential.is_default && (
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" /> Default
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm font-medium">
            <span className="flex items-center gap-1.5 capitalize text-slate-600 dark:text-slate-300">
              {credential.health_status === 'healthy' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {credential.health_status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              {credential.health_status === 'offline' && <XCircle className="h-4 w-4 text-red-500" />}
              {credential.health_status === 'unknown' && <Activity className="h-4 w-4 text-slate-400" />}
              {credential.health_status}
            </span>
            {credential.latency && (
              <span className="text-slate-500">{credential.latency} ms</span>
            )}
            <span className="text-slate-400">Pri: {credential.priority}</span>
          </div>
        </div>

        <button 
          onClick={handleToggle}
          disabled={isToggling}
          className={`p-2 rounded-lg transition-colors ${
            credential.is_active 
              ? 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20' 
              : 'text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800'
          }`}
        >
          {isToggling ? <Activity className="h-4 w-4 animate-spin" /> : credential.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
        </button>
      </div>

      {credential.last_error && (
        <div className="mb-4 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded-md border border-red-100 dark:border-red-900/30">
          Last Error: {credential.last_error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-4 border-t">
        <button onClick={() => onEdit(credential)} className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Edit className="h-4 w-4" /> Edit
        </button>
        <button onClick={handleTest} disabled={isTesting} className="text-sm font-medium text-slate-600 hover:text-green-600 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          {isTesting ? <Activity className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />} Test
        </button>
        {!credential.is_default && credential.is_active && (
          <button onClick={handleSetDefault} className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Star className="h-4 w-4" /> Set Default
          </button>
        )}
        <div className="flex-1" />
        <button onClick={handleDelete} disabled={isDeleting} className="text-sm font-medium text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          {isDeleting ? <Activity className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
        </button>
      </div>
    </div>
  )
}
