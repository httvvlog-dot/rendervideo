"use client"

import { useEffect, useState } from "react"
import { Play, Download, Trash2, CheckCircle, Video, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProjectOutput {
  id: string
  version: number
  is_current: boolean
  title: string | null
  output_url: string
  duration_ms: number
  width: number
  height: number
  fps: number
  file_size: number
  status: string
  created_at: string
}

export function RenderHistory({ projectId }: { projectId: string }) {
  const [outputs, setOutputs] = useState<{ latest: ProjectOutput | null, history: ProjectOutput[] }>({ latest: null, history: [] })
  const [loading, setLoading] = useState(true)

  const fetchOutputs = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/outputs`)
      if (res.ok) {
        const data = await res.json()
        setOutputs(data)
      }
    } catch (err) {
      console.error("Failed to fetch outputs:", err)
    } finally {
      setLoading(false)
    }
  }

  // Poll for outputs when they are missing or we might have just finished a render
  // For a production app, we'd use Supabase Realtime here.
  useEffect(() => {
    fetchOutputs()
    const interval = setInterval(fetchOutputs, 5000)
    return () => clearInterval(interval)
  }, [projectId])

  if (loading) return <div className="p-8 text-center text-slate-400">Loading history...</div>
  if (!outputs.latest && outputs.history.length === 0) return null // Hide if no history

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 MB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatDuration = (ms: number) => {
    if (!ms) return "0.0s"
    return (ms / 1000).toFixed(1) + "s"
  }

  return (
    <div className="space-y-6 mt-8">
      {/* Latest Output */}
      {outputs.latest && (
        <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Latest Output (V{outputs.latest.version})</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 font-mono">
                  <span className="bg-slate-800 px-2 py-1 rounded">MP4</span>
                  <span className="bg-slate-800 px-2 py-1 rounded">{outputs.latest.width}x{outputs.latest.height}</span>
                  <span className="bg-slate-800 px-2 py-1 rounded">{outputs.latest.fps} FPS</span>
                  <span className="bg-slate-800 px-2 py-1 rounded">{formatDuration(outputs.latest.duration_ms)}</span>
                  <span className="bg-slate-800 px-2 py-1 rounded">{formatSize(outputs.latest.file_size)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-end">
              <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-200" onClick={() => window.open(outputs.latest!.output_url, "_blank")}>
                <Play className="w-4 h-4 mr-2" /> Play
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => {
                const a = document.createElement("a");
                a.href = outputs.latest!.output_url;
                a.download = `Project_V${outputs.latest!.version}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}>
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Version History List */}
      {outputs.history.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-300 mb-4 flex items-center">
            <Video className="w-5 h-5 mr-2" /> Version History
          </h3>
          <div className="space-y-3">
            {outputs.history.map(output => (
              <div key={output.id} className={`flex items-center justify-between p-3 rounded-lg border ${output.is_current ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-800/50'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200">Version {output.version}</span>
                      {output.is_current && <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Current</span>}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1">
                      {new Date(output.created_at).toLocaleString()} • {formatSize(output.file_size)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-white" onClick={() => window.open(output.output_url, "_blank")}>
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-white" onClick={() => window.open(output.output_url, "_blank")}>
                    <Download className="w-4 h-4" />
                  </Button>
                  {/* Delete button would go here and call an API */}
                  <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
