"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Film, RefreshCw } from "lucide-react"
import { generateTimeline, rebuildTimeline } from "../timeline-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function TimelineGeneratorButton({ 
  projectId, 
  hasExistingScenes,
  allVoicesGenerated 
}: { 
  projectId: string;
  hasExistingScenes: boolean;
  allVoicesGenerated?: boolean;
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('taovideo:workflow-step', { detail: { step: 2 } }));
    setIsGenerating(true)
    const toastId = toast.loading("Generating timeline...")
    try {
      const res = await generateTimeline(projectId)
      if (!res.success) {
        if (res.code === "TIMELINE_ALREADY_EXISTS") {
          toast.dismiss(toastId)
          setShowConfirm(true)
        } else if (res.code === "SECTION_MEDIA_MISSING") {
          toast.error(`Media missing in ${res.missingSections?.length} section(s). Please assign images.`, { id: toastId })
        } else {
          toast.error(('message' in res ? res.message : res.code) || "Failed to generate timeline", { id: toastId })
        }
      } else {
        toast.success(`Timeline generated (${res.sceneCount} scenes)`, { id: toastId })
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRebuild = async () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('taovideo:workflow-step', { detail: { step: 3 } }));
    setIsGenerating(true)
    const toastId = toast.loading("Rebuilding timeline...")
    try {
      const res = await rebuildTimeline(projectId)
      if (!res.success) {
        if (res.code === "SECTION_MEDIA_MISSING") {
          toast.error(`Media missing in ${res.missingSections?.length} section(s). Please assign images.`, { id: toastId })
        } else {
          toast.error(('message' in res ? res.message : res.code) || "Failed to rebuild timeline", { id: toastId })
        }
      } else {
        toast.success(`Timeline rebuilt (${res.sceneCount} scenes)`, { id: toastId })
        setShowConfirm(false)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 mb-6">
        <h3 className="text-amber-800 dark:text-amber-400 font-medium mb-2 flex items-center">
          <RefreshCw className="h-4 w-4 mr-2" />
          Timeline Already Exists
        </h3>
        <p className="text-sm text-amber-700 dark:text-amber-500 mb-4">
          Generating a new timeline will overwrite all existing scenes and manual edits. Are you sure you want to rebuild it?
        </p>
        <div className="flex space-x-3">
          <Button onClick={() => setShowConfirm(false)} variant="outline" size="sm" className="bg-white">
            Keep Current
          </Button>
          <Button onClick={handleRebuild} disabled={isGenerating} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Yes, Rebuild Timeline
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button 
      onClick={() => hasExistingScenes ? setShowConfirm(true) : handleGenerate()} 
      disabled={isGenerating || (allVoicesGenerated === false)}
      className={
        (allVoicesGenerated !== false) 
        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
        : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
      }
    >
      {isGenerating ? 
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {hasExistingScenes ? "Rebuilding..." : "Generating..."}</> : 
        <><Film className="mr-2 h-4 w-4" /> {hasExistingScenes ? "Rebuild Timeline" : "Generate Timeline"}</>
      }
    </Button>
  )
}
