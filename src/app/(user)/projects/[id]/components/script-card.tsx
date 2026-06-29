"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { useState } from "react"
import { deleteScript } from "../actions"
import { toast } from "sonner"

export function ScriptCard({ script, projectId }: { script: any, projectId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this script version?")) return
    
    setIsDeleting(true)
    toast.loading("Deleting script...", { id: "delete-script" })
    try {
      const res = await deleteScript(script.id, projectId)
      if (res.error) {
        toast.error("Failed to delete: " + res.error, { id: "delete-script" })
      } else {
        toast.success("Script deleted.", { id: "delete-script" })
      }
    } catch (err: any) {
      toast.error(err.message, { id: "delete-script" })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="border-indigo-100 dark:border-indigo-900/50 shadow-md">
      <CardHeader className="flex flex-row items-start justify-between bg-indigo-50/50 dark:bg-indigo-950/20 pb-4 border-b">
        <div>
          <CardTitle className="flex items-center gap-2">
            Generated Script 
            <Badge variant="outline" className="bg-white dark:bg-slate-950">v{script.version || 1}</Badge>
          </CardTitle>
          <CardDescription className="mt-1">
            {new Date(script.created_at).toLocaleString()}
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50">
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* Telemetry Bar */}
        <div className="flex flex-wrap gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 border-b text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Provider:</span> {script.provider || "OpenRouter"}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Model:</span> {script.model || "Unknown"}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Tokens:</span> {script.tokens_input} in / {script.tokens_output} out
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Latency:</span> {script.latency_ms ? `${(script.latency_ms / 1000).toFixed(2)}s` : "N/A"}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Cost:</span> ${script.cost ? Number(script.cost).toFixed(5) : "0.00000"}
          </div>
        </div>
        
        {/* Script Content */}
        <div className="p-6 prose prose-slate dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
            {script.content}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
