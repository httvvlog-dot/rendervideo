"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, RefreshCw, Loader2 } from "lucide-react"
import { generateMissingProjectVoice } from "../voice-actions"
import { syncTimelineToVoice } from "../timeline-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function VoiceGeneratorButtons({ projectId }: { projectId: string }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const router = useRouter()

  const handleGenerateVoice = async () => {
    setIsGenerating(true)
    const toastId = toast.loading("Generating AI Voice...")
    try {
      const res = await generateMissingProjectVoice(projectId)
      if (res.success) {
        toast.success(`Generated ${res.generatedCount} voices (${res.skippedCount} skipped)`, { id: toastId })
        if (res.failedSections && res.failedSections.length > 0) {
          toast.warning(`Failed to generate ${res.failedSections.length} sections`, { id: toastId })
        }
        router.refresh()
      } else {
        toast.error(res.message || "Failed to generate voice", { id: toastId })
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSyncTimeline = async () => {
    setIsSyncing(true)
    const toastId = toast.loading("Syncing timeline to voice...")
    try {
      const res = await syncTimelineToVoice(projectId)
      if (res.success) {
        toast.success(`Timeline synced to voice duration`, { id: toastId })
        router.refresh()
      } else {
        toast.error(('message' in res ? res.message : res.code) || "Failed to sync timeline", { id: toastId })
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex space-x-2">
      <Button 
        variant="secondary" 
        onClick={handleGenerateVoice} 
        disabled={isGenerating || isSyncing}
        className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
      >
        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
        Generate Voice
      </Button>

      <Button 
        variant="outline" 
        onClick={handleSyncTimeline} 
        disabled={isGenerating || isSyncing}
      >
        {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        Sync Timeline
      </Button>
    </div>
  )
}
