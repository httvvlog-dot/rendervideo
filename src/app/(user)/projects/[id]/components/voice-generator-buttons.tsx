"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, RefreshCw, Loader2 } from "lucide-react"
import { generateMissingProjectVoice } from "../voice-actions"
import { syncTimelineToVoice } from "../timeline-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { useWorkflowStep } from "./workflow-indicator"

export function VoiceGeneratorButtons({ 
  projectId, 
  allVoicesGenerated, 
  hasAnySections 
}: { 
  projectId: string;
  allVoicesGenerated: boolean;
  hasAnySections: boolean;
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isVoiceChanging, setIsVoiceChanging] = useState(false)
  const router = useRouter()
  const { activeStep, setStep } = useWorkflowStep(allVoicesGenerated, true);

  useEffect(() => {
    const handleStart = () => setIsVoiceChanging(true);
    const handleEnd = () => setIsVoiceChanging(false);
    window.addEventListener('voice-change-start', handleStart as EventListener);
    window.addEventListener('voice-change-end', handleEnd as EventListener);
    return () => {
      window.removeEventListener('voice-change-start', handleStart as EventListener);
      window.removeEventListener('voice-change-end', handleEnd as EventListener);
    };
  }, []);

  const handleGenerateVoice = async (force: boolean = false) => {
    // Forcefully stop playback before doing heavy operations
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('taovideo:pause'));
      setStep(1);
    }
    
    setIsGenerating(true)
    const toastId = toast.loading(force ? "Regenerating All AI Voices..." : "Generating AI Voice...")
    try {
      const res = await generateMissingProjectVoice(projectId, undefined, force)
      console.log("[GenerateVoice] result:", res)
      
      if (res.success) {
        if (res.failedSections && res.failedSections.length > 0) {
          toast.warning(`Generated ${res.generatedCount}, failed ${res.failedSections.length}. Check logs.`, { id: toastId })
        } else {
          toast.success(`Generated voices for ${res.generatedCount} section(s)`, { id: toastId })
        }
        // Requirement 1: "khi regenerate all voice thì Workflow bắt buộc nhảy sang step 2"
        setStep(2);
        router.refresh()
      } else {
        toast.error(res.message || "Failed to generate voice", { id: toastId })
      }
    } catch (err: any) {
      console.error("[GenerateVoice] error:", err)
      toast.error(err.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSyncTimeline = async () => {
    setStep(2);
    setIsSyncing(true)
    const toastId = toast.loading("Syncing timeline to voice...")
    try {
      const res = await syncTimelineToVoice(projectId)
      if (res.success) {
        toast.success(`Timeline synced to voice duration`, { id: toastId })
        // Jump to Step 3 (Rebuild Timeline)
        setStep(3);
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
        onClick={() => handleGenerateVoice(false)} 
        disabled={isGenerating || isSyncing || isVoiceChanging || !hasAnySections || allVoicesGenerated}
        className={`transition-all ${
          activeStep === 1 && !allVoicesGenerated 
          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 shadow-md ring-2 ring-emerald-400" 
          : "bg-slate-100 text-slate-500 opacity-60 hover:opacity-100 dark:bg-slate-800 dark:text-slate-400"
        } disabled:opacity-40`}
      >
        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
        {allVoicesGenerated ? "Voices Ready" : "Generate Missing Voice"}
      </Button>
      
      <Button 
        variant="outline" 
        onClick={() => {
          if(confirm("This will overwrite ALL existing voices in the script with the newly selected voice. Continue?")) {
            handleGenerateVoice(true);
          }
        }} 
        disabled={isGenerating || isSyncing || isVoiceChanging || !hasAnySections}
        className={`transition-all ${
          activeStep === 1 
          ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20 border-orange-300 dark:border-orange-700 shadow-md ring-1 ring-orange-400" 
          : "text-slate-500 border-slate-200 opacity-60 hover:opacity-100 dark:border-slate-800 dark:text-slate-400"
        } disabled:opacity-40`}
      >
        Regenerate All Voices
      </Button>

      <Button 
        variant="outline" 
        onClick={handleSyncTimeline} 
        disabled={isGenerating || isSyncing || !allVoicesGenerated}
        className={`transition-all ${
          activeStep === 2 
          ? "border-blue-400 text-blue-700 dark:border-blue-500 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 shadow-md ring-2 ring-blue-400" 
          : "text-slate-500 border-slate-200 opacity-60 hover:opacity-100 dark:border-slate-800 dark:text-slate-400"
        } disabled:opacity-40`}
      >
        {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        Sync Timeline
      </Button>
    </div>
  )
}
