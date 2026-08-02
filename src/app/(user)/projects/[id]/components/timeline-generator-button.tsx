"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Film, RefreshCw, AlertCircle } from "lucide-react"
import { generateTimeline, rebuildTimeline } from "../timeline-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { useWorkflowStep } from "./workflow-indicator"

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
  const [missingMediaConfirm, setMissingMediaConfirm] = useState<{ sectionId: string; sectionIndex: number; title: string | null }[] | null>(null)
  const router = useRouter()
  const { activeStep, setStep } = useWorkflowStep(allVoicesGenerated ?? false, hasExistingScenes);

  const handleGenerate = async (allowMissingMedia: boolean = false) => {
    setStep(3);
    setIsGenerating(true)
    const toastId = toast.loading("Generating timeline...")
    try {
      const res = await generateTimeline(projectId, allowMissingMedia)
      if (!res.success) {
        if (res.code === "TIMELINE_ALREADY_EXISTS") {
          toast.dismiss(toastId)
          setShowConfirm(true)
        } else if (res.code === "SECTION_MEDIA_MISSING") {
          toast.dismiss(toastId)
          setMissingMediaConfirm(res.missingSections || [])
        } else {
          toast.error(('message' in res ? res.message : res.code) || "Failed to generate timeline", { id: toastId })
        }
      } else {
        toast.success(`Timeline generated (${res.sceneCount} scenes)`, { id: toastId })
        setStep(4); // Jump to Complete state
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRebuild = async (allowMissingMedia: boolean = false) => {
    setStep(3);
    setIsGenerating(true)
    const toastId = toast.loading("Rebuilding timeline...")
    try {
      const res = await rebuildTimeline(projectId, allowMissingMedia)
      if (!res.success) {
        if (res.code === "SECTION_MEDIA_MISSING") {
          toast.dismiss(toastId)
          setMissingMediaConfirm(res.missingSections || [])
        } else {
          toast.error(('message' in res ? res.message : res.code) || "Failed to rebuild timeline", { id: toastId })
        }
      } else {
        toast.success(`Timeline rebuilt (${res.sceneCount} scenes)`, { id: toastId })
        setShowConfirm(false)
        setStep(4); // Jump to Complete state
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
          <Button onClick={() => handleRebuild(false)} disabled={isGenerating} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Yes, Rebuild Timeline
          </Button>
        </div>
      </div>
    )
  }

  if (missingMediaConfirm) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 mb-6">
        <h3 className="text-amber-800 dark:text-amber-400 font-medium mb-2 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          Một số Section chưa có hình ảnh
        </h3>
        <div className="text-sm text-amber-700 dark:text-amber-500 mb-4 max-h-32 overflow-y-auto pl-6">
          <ul className="list-disc space-y-1">
            {missingMediaConfirm.map(s => (
              <li key={s.sectionId}>Section {s.sectionIndex} — {s.title || "Không có tiêu đề"}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-500 mb-4 font-medium">
          Bạn vẫn có thể tạo Timeline và bổ sung hình ảnh sau.
        </p>
        <div className="flex space-x-3">
          <Button onClick={() => setMissingMediaConfirm(null)} variant="outline" size="sm" className="bg-white">
            Bổ sung ảnh
          </Button>
          <Button 
            onClick={() => {
              setMissingMediaConfirm(null);
              if (showConfirm) {
                handleRebuild(true);
              } else {
                handleGenerate(true);
              }
            }} 
            disabled={isGenerating} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Vẫn Generate Timeline
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button 
      onClick={() => hasExistingScenes ? setShowConfirm(true) : handleGenerate(false)} 
      disabled={isGenerating || (allVoicesGenerated === false)}
      className={`transition-all w-full sm:w-auto ${
        (allVoicesGenerated !== false && activeStep === 3) 
        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md ring-2 ring-blue-400" 
        : (allVoicesGenerated !== false)
          ? "bg-slate-100 text-slate-500 opacity-60 hover:opacity-100 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
          : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed opacity-40"
      }`}
    >
      {isGenerating ? 
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {hasExistingScenes ? "Rebuilding..." : "Generating..."}</> : 
        <><Film className="mr-2 h-4 w-4" /> {hasExistingScenes ? "Rebuild Timeline" : "Generate Timeline"}</>
      }
    </Button>
  )
}
