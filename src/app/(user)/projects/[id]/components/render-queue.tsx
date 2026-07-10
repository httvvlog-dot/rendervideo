"use client"

import { useState, useEffect } from "react"
import { Check, Loader2, AlertCircle, Play, Download, Copy, Trash2, RefreshCw, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function RenderQueue({ jobId, onRenderAgain }: { jobId?: string, onRenderAgain?: () => void }) {
  // Placeholder mock state for demonstration
  const [status, setStatus] = useState("queued") // queued, preparing, downloading, building, rendering, encoding, uploading, completed, failed
  const [progress, setProgress] = useState(0)
  
  // Simulate progress for MVP UI demo
  useEffect(() => {
    if (!jobId) return

    const stages = ["queued", "preparing", "downloading", "building", "rendering", "encoding", "uploading", "completed"]
    let currentStageIdx = 0

    const interval = setInterval(() => {
      currentStageIdx++
      if (currentStageIdx >= stages.length) {
        clearInterval(interval)
        return
      }
      setStatus(stages[currentStageIdx])
      
      if (stages[currentStageIdx] === "rendering") {
        let p = 0
        const renderInterval = setInterval(() => {
          p += 5
          setProgress(p)
          if (p >= 100) clearInterval(renderInterval)
        }, 200)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId])

  if (!jobId) return null

  const renderSteps = [
    { id: "queued", label: "Queued" },
    { id: "preparing", label: "Preparing Engine" },
    { id: "downloading", label: "Downloading Assets" },
    { id: "building", label: "Building Timeline" },
    { id: "rendering", label: "Rendering Frames" },
    { id: "encoding", label: "Encoding MP4" },
    { id: "uploading", label: "Uploading to R2" },
  ]

  const getCurrentStepIndex = () => renderSteps.findIndex(s => s.id === status)

  if (status === "completed") {
    return (
      <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-8 mt-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Render Completed!</h2>
              <div className="flex items-center space-x-3 text-sm text-slate-400 font-mono">
                <span className="bg-slate-800 px-2 py-1 rounded">MP4</span>
                <span>•</span>
                <span>1080x1920</span>
                <span>•</span>
                <span>31.4 MB</span>
                <span>•</span>
                <span>01:00</span>
              </div>
            </div>
          </div>

          {/* Download Center Actions */}
          <div className="flex flex-wrap gap-3 justify-end">
            <Button className="bg-white text-slate-900 hover:bg-slate-200 shadow-lg">
              <Play className="w-4 h-4 mr-2" /> Preview
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg">
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700">
              <Copy className="w-4 h-4 mr-2" /> Copy URL
            </Button>
            <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700" onClick={onRenderAgain}>
              <RefreshCw className="w-4 h-4 mr-2" /> Render Again
            </Button>
            <Button variant="outline" disabled className="border-slate-700 bg-slate-800/50 text-slate-500">
              <FolderOpen className="w-4 h-4 mr-2" /> Open Folder
            </Button>
            <Button variant="destructive" className="bg-red-900/50 text-red-400 hover:bg-red-900/80 border-transparent">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-indigo-900/50 rounded-xl p-8 mt-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-8 flex items-center">
        <Loader2 className="w-6 h-6 mr-3 animate-spin text-indigo-400" />
        Render Job Active
        <span className="ml-auto text-sm font-mono text-indigo-400">ETA: ~45s</span>
      </h2>

      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-slate-800" />
        
        <div className="space-y-6">
          {renderSteps.map((step, idx) => {
            const isCompleted = getCurrentStepIndex() > idx
            const isActive = status === step.id
            const isPending = getCurrentStepIndex() < idx

            return (
              <div key={step.id} className={`relative flex items-center pl-10 ${isActive ? 'opacity-100' : isCompleted ? 'opacity-50' : 'opacity-30 grayscale'}`}>
                
                {/* Node */}
                <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-slate-900 ${
                  isActive ? 'bg-indigo-500' : isCompleted ? 'bg-emerald-500' : 'bg-slate-700'
                }`}>
                  {isCompleted ? <Check className="w-3 h-3 text-white" /> : isActive ? <div className="w-2 h-2 bg-white rounded-full animate-ping" /> : null}
                </div>

                <div className="flex-1">
                  <h3 className={`font-semibold ${isActive ? 'text-indigo-300' : 'text-slate-300'}`}>{step.label}</h3>
                  {isActive && step.id === "rendering" && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                        <span>Rendering Scene 2/6</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
