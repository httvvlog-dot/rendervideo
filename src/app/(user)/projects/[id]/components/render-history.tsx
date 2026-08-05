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
        <div className="relative rounded-[17px] p-[1px] bg-gradient-to-br from-purple-500 via-violet-500 to-cyan-400 shadow-[0_0_20px_rgba(139,92,246,0.15)] max-sm:shadow-none mb-6 group">
          <div className="bg-slate-900 rounded-2xl p-4 sm:p-6 relative overflow-hidden h-full w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 relative z-10">
            <div className="flex items-center space-x-4 sm:space-x-6">
              <div className="hidden sm:flex w-12 h-12 bg-emerald-500/20 rounded-full items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 sm:mb-1.5">
                  <div className="sm:hidden w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0 mr-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    🎬 Latest Render <span className="text-emerald-400 text-base sm:text-lg">V{outputs.latest.version}</span>
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-400 font-mono">
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">MP4</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{getResolutionLabel(outputs.latest.width, outputs.latest.height)}</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{outputs.latest.fps} FPS</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{formatDuration(outputs.latest.duration_ms)}</span>
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{formatSize(outputs.latest.file_size)}</span>
                  <span className="text-slate-500 ml-1 sm:ml-2 block sm:inline w-full sm:w-auto mt-1 sm:mt-0">Rendered: {timeAgo(outputs.latest.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none border-slate-700 bg-slate-800 text-slate-200 text-xs sm:text-sm h-8 sm:h-9" onClick={() => handlePlay(outputs.latest!)} disabled={workingId === outputs.latest.id}>
                {workingId === outputs.latest.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 sm:mr-2 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5 sm:mr-2" />} Play
              </Button>
              <Button size="sm" className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm h-8 sm:h-9" onClick={() => handleDownload(outputs.latest!)}>
                <Download className="w-3.5 h-3.5 mr-1.5 sm:mr-2" /> Download
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Render History List */}
      {outputs.history.length > 0 && (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-6 shadow-sm">
          <div className="mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
              Render History &middot; {outputs.history.length} version{outputs.history.length > 1 ? 's' : ''}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">Previous rendered versions</p>
          </div>
          
          <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800/60">
            {outputs.history.map(output => (
              <div key={output.id} className="group relative p-4 -mx-4 sm:-mx-6 sm:px-6 rounded-lg transition-colors hover:border-transparent">
                {/* Hover Gradient Border Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-violet-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none p-[1px] z-0 rounded-lg">
                  <div className="bg-slate-50 dark:bg-slate-900 w-full h-full rounded-[7px]"></div>
                </div>
                {/* Content */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">Version {output.version}</span>
                    {output.is_current && <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded">Current</span>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2 flex-wrap mt-1">
                    <span>{getResolutionLabel(output.width, output.height)}</span>
                    <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                    <span>{output.fps} FPS</span>
                    <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                    <span>{formatDuration(output.duration_ms)}</span>
                    <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                    <span>{formatSize(output.file_size)}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(output.created_at).toLocaleDateString()} {new Date(output.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-end mt-1.5 sm:mt-0 w-full sm:w-auto">
                  {!output.is_current && (
                    <Button variant="ghost" size="sm" className="h-7 sm:h-8 px-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hidden sm:inline-flex" title="Set as Current" onClick={() => handleSetCurrent(output.id)} disabled={workingId === output.id}>
                      <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-7 sm:h-8 text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" onClick={() => handlePlay(output)} disabled={workingId === output.id}>
                    <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" /> Play
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-7 sm:h-8 text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" onClick={() => handleDownload(output)}>
                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" /> Download
                  </Button>
                  {!output.is_current && (
                    <Button variant="ghost" size="sm" className="h-7 sm:h-8 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20" title="Delete version" onClick={() => handleDelete(output.id)} disabled={workingId === output.id}>
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  )}
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
