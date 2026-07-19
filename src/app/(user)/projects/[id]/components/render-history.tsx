"use client"

import { useEffect, useState } from "react"
import { Play, Download, Trash2, CheckCircle, Video, Loader2, Star, X } from "lucide-react"
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
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)

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

  useEffect(() => {
    fetchOutputs()
    const interval = setInterval(fetchOutputs, 5000)
    return () => clearInterval(interval)
  }, [projectId])

  const handleDelete = async (outputId: string) => {
    if (!confirm("Are you sure you want to delete this render?")) return
    setWorkingId(outputId)
    try {
      await fetch(`/api/projects/${projectId}/outputs/${outputId}`, { method: 'DELETE' })
      await fetchOutputs()
    } finally {
      setWorkingId(null)
    }
  }

  const handleSetCurrent = async (outputId: string) => {
    setWorkingId(outputId)
    try {
      await fetch(`/api/projects/${projectId}/outputs/${outputId}`, { method: 'PATCH' })
      await fetchOutputs()
    } finally {
      setWorkingId(null)
    }
  }

  const handlePlay = async (output: ProjectOutput) => {
    setWorkingId(output.id)
    try {
      const res = await fetch(`/api/projects/${projectId}/outputs/${output.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          setPlayingVideoUrl(data.url)
        }
      }
    } finally {
      setWorkingId(null)
    }
  }

  const handleDownload = (output: ProjectOutput) => {
    // For download, we redirect to the force-download API endpoint
    window.location.href = `/api/projects/${projectId}/outputs/${output.id}?download=1`
  }

  if (loading) return <div className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading history...</div>
  if (!outputs.latest && outputs.history.length === 0) return null

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 MB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatDuration = (ms: number) => {
    if (!ms) return "0.0s"
    return (ms / 1000).toFixed(1) + "s"
  }

  const getResolutionLabel = (w: number, h: number) => {
    const pixels = w * h;
    if (pixels >= 3840 * 2160 * 0.9) return '4K';
    if (pixels >= 2560 * 1440 * 0.9) return '1440P';
    if (pixels >= 1920 * 1080 * 0.9) return '1080P';
    if (pixels >= 1280 * 720 * 0.9) return '720P';
    return `${w}x${h}`;
  }
  
  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return `${diff} seconds ago`
    if (diff < 3600) return `${Math.floor(diff/60)} minutes ago`
    if (diff < 86400) return `${Math.floor(diff/3600)} hours ago`
    return `${Math.floor(diff/86400)} days ago`
  }

  return (
    <div className="space-y-6 mt-8">
      {/* Video Modal */}
      {playingVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8">
          <div className="relative w-full max-w-5xl bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-slate-800">
            <div className="absolute top-0 left-0 w-full p-4 flex justify-end z-10 bg-gradient-to-b from-black/50 to-transparent">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur" onClick={() => setPlayingVideoUrl(null)}>
                <X className="w-6 h-6" />
              </Button>
            </div>
            <video 
              src={playingVideoUrl} 
              controls 
              autoPlay 
              className="w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

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
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  🎬 Latest Render <span className="text-emerald-400 text-lg">V{outputs.latest.version}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 font-mono">
                  <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">MP4</span>
                  <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">{getResolutionLabel(outputs.latest.width, outputs.latest.height)}</span>
                  <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">{outputs.latest.fps} FPS</span>
                  <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">{formatDuration(outputs.latest.duration_ms)}</span>
                  <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">{formatSize(outputs.latest.file_size)}</span>
                  <span className="text-slate-500 ml-2">Rendered: {timeAgo(outputs.latest.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-end shrink-0">
              <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-200" onClick={() => handlePlay(outputs.latest!)} disabled={workingId === outputs.latest.id}>
                {workingId === outputs.latest.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />} Play
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => handleDownload(outputs.latest!)}>
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
                    <div className="text-xs text-slate-500 font-mono mt-1 flex gap-3">
                      <span>{new Date(output.created_at).toLocaleString()}</span>
                      <span>{getResolutionLabel(output.width, output.height)}</span>
                      <span>{formatDuration(output.duration_ms)}</span>
                      <span>{formatSize(output.file_size)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!output.is_current && (
                    <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-emerald-400" title="Set as Current" onClick={() => handleSetCurrent(output.id)} disabled={workingId === output.id}>
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-white" onClick={() => handlePlay(output)} disabled={workingId === output.id}>
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-white" onClick={() => handleDownload(output)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  {!output.is_current && (
                    <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-red-400" onClick={() => handleDelete(output.id)} disabled={workingId === output.id}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
