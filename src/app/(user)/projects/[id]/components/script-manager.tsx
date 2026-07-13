"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, RotateCcw, Trash, FileText, Loader2, Clock, Zap, DollarSign } from "lucide-react"
import { generateScript, deleteScriptVersion, setActiveScript } from "../script-actions"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { ScriptSectionList } from "./script-section-list"

export function ScriptManager({ projectId, scripts, project }: { projectId: string, scripts: any[], project?: any }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeVersion, setActiveVersion] = useState<number>(scripts.length > 0 ? Math.max(...scripts.map(s => s.version)) : 0)
  const [sections, setSections] = useState<any[]>([])
  const [isLoadingSections, setIsLoadingSections] = useState(false)

  const activeScript = scripts.find(s => s.version === activeVersion)
  const supabase = createClient()

  useEffect(() => {
    async function loadSections() {
      if (!activeScript) return
      setIsLoadingSections(true)
      const { data, error } = await supabase
        .from('script_sections')
        .select('*')
        .eq('script_id', activeScript.id)
        .order('section_index', { ascending: true })
      
      if (!error && data) {
        setSections(data)
      } else {
        setSections([])
      }
      setIsLoadingSections(false)
    }
    loadSections()
  }, [activeScript, supabase])

  const handleGenerate = async () => {
    setIsGenerating(true)
    const toastId = toast.loading("Generating script via OpenRouter...")
    try {
      await generateScript(projectId)
      toast.success("Script generated successfully!", { id: toastId })
      // When generating a new script, we don't automatically set it as the active version for timeline,
      // but we do show it in the UI.
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
        setActiveVersion(Math.max(...remaining.map(s => s.version)))
      } else {
        setActiveVersion(0)
      }
    } catch (err: any) {
      toast.error(err.message, { id: 'del' })
    }
  }

  const handleSetActive = async () => {
    if (!activeScript) return
    const toastId = toast.loading("Setting active script...")
    try {
      await setActiveScript(projectId, activeScript.id)
      toast.success("Active script updated", { id: toastId })
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2 text-indigo-500" /> Script Manager
          </h2>
          {project?.active_script_id === activeScript?.id ? (
            <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-md font-medium border border-green-200">
              Active for Timeline
            </span>
          ) : (
            <Button onClick={handleSetActive} variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              Set as Active Version
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <select 
            value={activeVersion} 
            onChange={(e) => setActiveVersion(Number(e.target.value))}
            className="border rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-900 font-medium"
          >
            {scripts.map(s => (
              <option key={s.id} value={s.version}>Version {s.version} {s.id === project?.active_script_id ? "(Active)" : ""} ({new Date(s.created_at).toLocaleTimeString()})</option>
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
          <CardContent className="p-4 bg-slate-100/50 dark:bg-slate-900/20">
            {isLoadingSections ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : sections.length > 0 && project ? (
              <ScriptSectionList project={project} sections={sections} />
            ) : (
              <textarea 
                readOnly 
                className="w-full h-80 p-4 bg-white dark:bg-slate-900 border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 font-serif leading-relaxed text-slate-800 dark:text-slate-200"
                value={activeScript.content}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
