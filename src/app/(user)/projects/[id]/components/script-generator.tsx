"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, RotateCw, Loader2 } from "lucide-react"
import { generateScript } from "../actions"
import { toast } from "sonner"

interface ScriptGeneratorProps {
  projectId: string
  workflowState: string // pending, processing, completed, failed, retrying, cancelled
}

export function ScriptGenerator({ projectId, workflowState }: ScriptGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async (isRetry = false) => {
    setIsGenerating(true)
    toast.loading(isRetry ? "Retrying script generation..." : "Generating script...", { id: "script-gen" })
    
    try {
      const res = await generateScript(projectId)
      if (res.error) {
        toast.error("Failed: " + res.error, { id: "script-gen" })
      } else {
        toast.success("Script generated successfully!", { id: "script-gen" })
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred", { id: "script-gen" })
    } finally {
      setIsGenerating(false)
    }
  }

  const isProcessing = workflowState === "processing" || workflowState === "retrying" || isGenerating

  if (workflowState === "completed") {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={() => handleGenerate(true)} disabled={isProcessing}>
        {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Regenerating...</> : <><RotateCw className="mr-2 h-4 w-4" /> Regenerate Script</>}
      </Button>
    )
  }

  return (
    <Button 
      variant={workflowState === "failed" ? "destructive" : "default"} 
      size="sm" 
      className="w-full" 
      onClick={() => handleGenerate(workflowState === "failed")} 
      disabled={isProcessing}
    >
      {isProcessing ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {workflowState === "retrying" ? "Retrying..." : "Processing..."}</>
      ) : workflowState === "failed" ? (
        <><RotateCw className="mr-2 h-4 w-4" /> Retry Scripting</>
      ) : (
        <><Play className="mr-2 h-4 w-4" /> Run Scripting</>
      )}
    </Button>
  )
}
