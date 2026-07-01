
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, RotateCcw, Trash, FileText, Loader2, Clock, Zap, DollarSign } from "lucide-react"
import { generateScript, deleteScriptVersion } from "../script-actions"
import { toast } from "sonner"

export function ScriptManager({ projectId, scripts }: { projectId: string, scripts: any[] }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeVersion, setActiveVersion] = useState<number>(scripts.length > 0 ? scripts[0].version : 0)

  const activeScript = scripts.find(s => s.version === activeVersion)

  const handleGenerate = async () => {
    setIsGenerating(true)
    const toastId = toast.loading("Generating script via OpenRouter...")
    try {
      await generateScript(projectId)
      toast.success("Script generated successfully!", { id: toastId })
      // Newest version will be passed down via Server Components revalidation,
      // but we can assume it will be max version + 1
      const maxV = scripts.length > 0 ? Math.max(...scripts.map(s => s.version)) : 0
      setActiveVersion(maxV + 1)
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!activeScript) return
    if (!confirm(`Are you sure you want to delete Version ${activeScript.version}?`)) return
    
    toast.loading("Deleting...", { id: 'del' })
    try {
      await deleteScriptVersion(activeScript.id, projectId)
      toast.success("Deleted", { id: 'del' })
      const remaining = scripts.filter(s => s.id !== activeScript.id)
      if (remaining.length > 0) {
        setActiveVersion(remaining[0].version)
      } else {
        setActiveVersion(0)
      }
    } catch (err: any) {
      toast.error(err.message, { id: 'del' })
    }
  }

  if (scripts.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50 mt-6">
        <CardContent className="flex flex-col items-center justify-center h-48 text-center">
          <FileText className="h-10 w-10 text-slate-400 mb-4 opacity-50" />
          <h2 className="text-lg font-semibold">No Script Generated</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Start the AI pipeline by generating the initial video script.</p>
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Play className="mr-2 h-4 w-4" /> Generate Script</>}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center">
          <FileText className="h-5 w-5 mr-2 text-indigo-500" /> Script Manager
        </h2>
        <div className="flex items-center space-x-2">
          <select 
            value={activeVersion} 
            onChange={(e) => setActiveVersion(Number(e.target.value))}
            className="border rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-900 font-medium"
          >
            {scripts.map(s => (
              <option key={s.id} value={s.version}>Version {s.version} ({new Date(s.created_at).toLocaleTimeString()})</option>
            ))}
          </select>
          <Button onClick={handleGenerate} disabled={isGenerating} variant="outline" size="sm">
             {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
             Regenerate
          </Button>
          <Button onClick={handleDelete} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
             <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeScript && (
        <Card>
          <div className="border-b bg-slate-50 dark:bg-slate-900 px-4 py-2 flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center"><Zap className="h-3.5 w-3.5 mr-1" /> {activeScript.model}</span>
            <span className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1" /> {activeScript.latency_ms}ms</span>
            <span>Tokens: {activeScript.tokens_input} in / {activeScript.tokens_output} out</span>
            <span className="flex items-center"><DollarSign className="h-3.5 w-3.5 mr-0.5" /> {activeScript.cost || 0}</span>
            <span>{activeScript.word_count} words</span>
          </div>
          <CardContent className="p-0">
            <textarea 
              readOnly 
              className="w-full h-80 p-4 bg-transparent resize-none focus:outline-none focus:ring-0 font-serif leading-relaxed text-slate-800 dark:text-slate-200"
              value={activeScript.content}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
