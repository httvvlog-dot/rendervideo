"use client"

import { useState, useEffect } from "react"
import { Check, Loader2, AlertCircle, Play, Download, Copy, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RenderQueueReal({ jobId, onRenderAgain, onComplete }: { jobId?: string, onRenderAgain?: () => void, onComplete?: () => void }) {
  const [status, setStatus] = useState("queued") // queued, preparing, rendering, uploading, completed, failed
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")
  const [outputUrl, setOutputUrl] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  
  useEffect(() => {
    if (!jobId) return

    let timeoutId: NodeJS.Timeout

    const poll = async () => {
      try {
        const res = await fetch(`/api/render/${jobId}`)
        const data = await res.json()
        
        if (data.job) {
          setStatus(data.job.status)
          setProgress(data.job.progress || 0)
          setProgressMessage(data.job.progress_message || "")
          
          if (data.job.status === "completed") {
            setOutputUrl(data.job.output_url || "")
            if (onComplete) {
              setTimeout(onComplete, 3000)
            }
            return // stop polling
          }
          if (data.job.status === "failed") {
            setErrorMsg(data.job.error_message || "Unknown error")
            return // stop polling
          }
        }
      } catch (err) {
        console.error("Poll error", err)
      }
      
      timeoutId = setTimeout(poll, 2000)
    }

    poll()

    return () => clearTimeout(timeoutId)
  }, [jobId])

  if (!jobId) return null

  const renderSteps = [
    { id: "queued", label: "Queued" },
    { id: "preparing", label: "Downloading Assets" },
    { id: "rendering", label: "Rendering Frames" },
    { id: "uploading", label: "Uploading to R2" },
  ]

  const getCurrentStepIndex = () => {
    if (status === "completed") return 99
    if (status === "failed") return -1
    return renderSteps.findIndex(s => s.id === status)
  }

  if (status === "failed") {
    return (
      <div className="bg-slate-900 border border-red-900/50 rounded-xl p-8 mt-6 shadow-2xl relative overflow-hidden">
         <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Render Failed</h2>
              <div className="text-red-400">{errorMsg}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-200" onClick={onRenderAgain}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

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
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            {outputUrl && (
              <>
                <Button className="bg-white text-slate-900 hover:bg-slate-200 shadow-lg" onClick={() => window.open(outputUrl, '_blank')}>
                  <Play className="w-4 h-4 mr-2" /> Play
                </Button>
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg" onClick={() => {
                  const a = document.createElement('a')
                  a.href = outputUrl
                  a.download = `taovideo-${jobId}.mp4`
                  a.target = '_blank'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                }}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700" onClick={() => navigator.clipboard.writeText(outputUrl)}>
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>
              </>
            )}
            <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700" onClick={onRenderAgain}>
              <RefreshCw className="w-4 h-4 mr-2" /> Render Again
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
      </h2>

      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-slate-800" />
        <div className="space-y-6">
          {renderSteps.map((step, idx) => {
            const isCompleted = getCurrentStepIndex() > idx
            const isActive = status === step.id

            return (
              <div key={step.id} className={`relative flex items-center pl-10 ${isActive ? 'opacity-100' : isCompleted ? 'opacity-50' : 'opacity-30 grayscale'}`}>
                <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-slate-900 ${
                  isActive ? 'bg-indigo-500' : isCompleted ? 'bg-emerald-500' : 'bg-slate-700'
                }`}>
                  {isCompleted ? <Check className="w-3 h-3 text-white" /> : isActive ? <div className="w-2 h-2 bg-white rounded-full animate-ping" /> : null}
                </div>

                <div className="flex-1">
                  <h3 className={`font-semibold ${isActive ? 'text-indigo-300' : 'text-slate-300'}`}>{step.label}</h3>
                  {isActive && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                        <span>{progressMessage}</span>
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
