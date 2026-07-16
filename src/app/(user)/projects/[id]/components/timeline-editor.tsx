"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Play, Pause, Download, Music, Mic, Type, Image as ImageIcon, RotateCcw } from "lucide-react"
import { RenderQueueReal } from "./render-queue-real"
import { RenderHistory } from "./render-history"
import { normalizePreviewScenes, PreviewScene } from "@/utils/timeline/normalize-preview-scenes"
import { ClientPreviewPlayer } from "./client-preview-player"
import { AudioPlaybackManager } from "./audio-playback-manager"
import { globalAudioEngine } from "@/utils/audio/audio-engine"
import { AudioDiagnosticsPanel } from "./audio-diagnostics-panel"

interface Scene {
  id: string
  media_id: string
  duration: number
  start_time: number
  end_time: number
  sort_order: number
  transition_type?: string
  transition_duration?: number
  start_scale?: number
  end_scale?: number
  start_x?: number
  end_x?: number
  start_y?: number
  end_y?: number
  opacity?: number
  section_id?: string
}

export function TimelineEditor({ 
  initialScenes, 
  media = [], 
  voiceMedia = [], 
  projectId, 
  sections = []
}: { 
  initialScenes: Scene[], 
  media?: any[], 
  voiceMedia?: any[], 
  projectId: string, 
  sections?: any[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [renderJobId, setRenderJobId] = useState<string | undefined>(undefined)

  // 1. Normalize Scenes
  const previewScenes = useMemo(() => normalizePreviewScenes(initialScenes, media), [initialScenes, media])
  
  const totalDurationMs = previewScenes.length > 0 
    ? previewScenes[previewScenes.length - 1].endTimeMs 
    : 0

  // 1b. Map sections to Voice Track Blocks
  const voiceBlocks = useMemo(() => {
    const blocks: { id: string, sectionIndex: number, startMs: number, durationMs: number, sourceUrl: string }[] = []
    for (const section of sections) {
      if (section.voice_media_id && section.voice_duration_ms) {
        // Find public URL from voiceMedia
        const voiceAsset = voiceMedia.find(m => m.id === section.voice_media_id)
        if (!voiceAsset?.public_url) continue;

        // Find start time from scenes
        const sectionScenes = previewScenes.filter(s => s.sectionId === section.id)
        if (sectionScenes.length > 0) {
          const startMs = Math.min(...sectionScenes.map(s => s.startTimeMs))
          blocks.push({
            id: section.id,
            sectionIndex: section.section_index || 0,
            startMs: startMs,
            durationMs: section.voice_duration_ms,
            sourceUrl: voiceAsset.public_url
          })
        }
      }
    }
    return blocks
  }, [sections, previewScenes, voiceMedia])

  // 2. Playback State
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  
  const requestRef = useRef<number | undefined>(undefined)
  const playbackRef = useRef({
    startClock: 0,
    startTimelineTime: 0
  })

  // 3. Playback Loop
  const animate = useCallback((time: number) => {
    if (!playbackRef.current.startClock) {
      playbackRef.current.startClock = time
      playbackRef.current.startTimelineTime = currentTimeMs
    }

    const elapsed = time - playbackRef.current.startClock
    
    // Slaving the UI to the AudioEngine's highly precise WebAudio clock
    const engineTime = globalAudioEngine.getPlaybackTime()
    let nextTime = engineTime !== null 
        ? engineTime 
        : playbackRef.current.startTimelineTime + elapsed

    if (nextTime >= totalDurationMs) {
      setIsPlaying(false)
      setCurrentTimeMs(0) // Return to start automatically when finished
      playbackRef.current.startClock = 0 // Reset for next play
      return // Stop animation
    }

    setCurrentTimeMs(nextTime)
    requestRef.current = requestAnimationFrame(animate)
  }, [totalDurationMs, isPlaying])

  useEffect(() => {
    if (isPlaying) {
      playbackRef.current.startClock = performance.now()
      playbackRef.current.startTimelineTime = currentTimeMs
      requestRef.current = requestAnimationFrame(animate)
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      playbackRef.current.startClock = 0
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [isPlaying, animate])

  const togglePlay = () => {
    if (currentTimeMs >= totalDurationMs && !isPlaying) {
      setCurrentTimeMs(0) // Restart if at the end
    }
    // Safari/Chrome autoplay policy: Wake up context synchronously on user gesture
    globalAudioEngine.getContext().resume()
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (timeMs: number) => {
    let safeTime = timeMs
    if (safeTime < 0) safeTime = 0
    if (safeTime > totalDurationMs) safeTime = totalDurationMs
    
    setCurrentTimeMs(safeTime)
    if (isPlaying) {
      // Reset clock so it resumes from the new seek position smoothly
      playbackRef.current.startClock = performance.now()
      playbackRef.current.startTimelineTime = safeTime
    }
  }

  // Handle click on timeline track
  const trackRef = useRef<HTMLDivElement>(null)
  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    handleSeek(percentage * totalDurationMs)
  }

  return (
    <>
    <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f111a] shadow-lg mt-6">
      
      {/* Top Toolbar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex justify-between items-center shrink-0">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={togglePlay}
            className="bg-white dark:bg-slate-800 w-24"
          >
            {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSeek(0)}
            className="bg-white dark:bg-slate-800"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="flex items-center px-4 font-mono text-xs text-slate-500 bg-slate-200 dark:bg-slate-800 rounded">
            {(currentTimeMs / 1000).toFixed(2)}s / {(totalDurationMs / 1000).toFixed(2)}s
          </div>
        </div>
        <Button 
          size="sm" 
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
          onClick={async () => {
            try {
              const res = await fetch('/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId })
              });
              const data = await res.json();
              if (data.jobId) {
                setRenderJobId(data.jobId);
              } else if (data.error) {
                toast.error(data.error);
              } else {
                toast.error("Render failed with unknown error");
              }
            } catch (err: any) {
              console.error(err);
              toast.error(err.message || "Failed to trigger render");
            }
          }}
          disabled={!!renderJobId}
        >
          <Download className="w-4 h-4 mr-2" /> Render Video (MP4)
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[400px]">
        {/* Left side: Client Preview Player */}
        <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-950 p-4 flex items-center justify-center">
          <div className="w-full max-w-[280px] aspect-[9/16] relative">
            <ClientPreviewPlayer scenes={previewScenes} currentTimeMs={currentTimeMs} />
          </div>
        </div>

        {/* Right side: Timeline Tracks Area */}
        <div className="flex-1 flex flex-col p-4 bg-slate-50 dark:bg-[#0f111a] overflow-x-hidden">
          
          {/* Slider for seeking */}
          <div className="mb-6 flex items-center space-x-4">
            <span className="text-xs text-slate-400 font-mono">0s</span>
            <input 
              type="range" 
              min={0} 
              max={totalDurationMs} 
              value={currentTimeMs} 
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-xs text-slate-400 font-mono">{(totalDurationMs/1000).toFixed(1)}s</span>
          </div>

          <div className="space-y-4 relative flex-1">
            
            {/* Playhead Overlay wrapper (matches track width) */}
            <div className="absolute top-0 bottom-0 left-24 right-0 z-20 pointer-events-none">
              <div 
                className="absolute top-0 bottom-0 w-px bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]"
                style={{ left: `${totalDurationMs > 0 ? (currentTimeMs / totalDurationMs) * 100 : 0}%` }}
              >
                <div className="absolute -top-2 -left-1.5 w-3 h-3 bg-red-500 rotate-45 rounded-sm"></div>
              </div>
            </div>

            {/* VIDEO TRACK (Active) */}
            <div className="flex relative z-10">
              <div className="w-24 shrink-0 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 px-2 rounded-l-md">
                <ImageIcon className="w-3 h-3 mr-1" /> Video
              </div>
              <div 
                ref={trackRef}
                onClick={handleTrackClick}
                className="flex-1 bg-slate-200 dark:bg-[#1a1d2d] rounded-r-md border-y border-r border-slate-300 dark:border-slate-800 shadow-inner relative min-h-[5rem] flex cursor-pointer overflow-hidden"
              >
                {previewScenes.map((scene) => (
                  <div
                    key={scene.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(scene.id); }}
                    className={`relative h-full bg-indigo-900 border-r border-indigo-950 flex flex-col items-center justify-center text-[10px] text-white select-none transition-colors hover:bg-indigo-800 shrink-0
                      ${selectedId === scene.id ? "bg-indigo-600 shadow-inner z-10" : ""}
                    `}
                    style={{ width: `${totalDurationMs > 0 ? (scene.durationMs / totalDurationMs) * 100 : 0}%` }}
                    title={`Scene: ${(scene.durationMs/1000).toFixed(1)}s`}
                  >
                    {scene.mediaId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={scene.publicUrl || ""} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay pointer-events-none" />
                    ) : null}
                    <span className="relative z-10 drop-shadow-md truncate w-full text-center px-1">{(scene.durationMs/1000).toFixed(1)}s</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VOICE TRACK */}
            <div className="flex relative z-0 mt-2">
              <div className="w-24 shrink-0 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 px-2 rounded-l-md">
                <Mic className="w-3 h-3 mr-1" /> Voice
              </div>
              <div className="flex-1 bg-slate-200 dark:bg-[#1a1d2d] rounded-r-md border-y border-r border-slate-300 dark:border-slate-800 shadow-inner relative min-h-[3rem] overflow-hidden">
                {voiceBlocks.length > 0 ? voiceBlocks.map(block => (
                  <div
                    key={block.id}
                    className="absolute top-1 bottom-1 bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400 rounded flex items-center justify-center text-[10px] text-white shadow-sm overflow-hidden whitespace-nowrap px-2 transition-colors cursor-pointer"
                    style={{
                      left: `${totalDurationMs > 0 ? (block.startMs / totalDurationMs) * 100 : 0}%`,
                      width: `${totalDurationMs > 0 ? (block.durationMs / totalDurationMs) * 100 : 0}%`
                    }}
                    title={`Voice Duration: ${(block.durationMs/1000).toFixed(1)}s`}
                  >
                    S{block.sectionIndex} ({(block.durationMs/1000).toFixed(1)}s)
                  </div>
                )) : (
                  <div className="flex items-center justify-center w-full h-full text-xs text-slate-400">
                    No Voice Tracks (Run Generate Voice)
                  </div>
                )}
              </div>
            </div>

            {/* SUBTITLE TRACK (Disabled) */}
            <div className="flex opacity-50 grayscale pointer-events-none">
              <div className="w-24 shrink-0 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 px-2 rounded-l-md">
                <Type className="w-3 h-3 mr-1" /> Subs
              </div>
              <div className="flex-1 bg-slate-200 dark:bg-[#1a1d2d] rounded-r-md border-y border-r border-slate-300 dark:border-slate-800 p-2 min-h-[3rem] flex items-center justify-center text-xs text-slate-400">
                [ Coming Soon ]
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
        {/* AUDIO ENGINE */}
      <AudioPlaybackManager 
        isPlaying={isPlaying}
        currentTimeMs={currentTimeMs}
        audioTracks={voiceBlocks.map(b => ({ id: b.id, sourceUrl: b.sourceUrl, startMs: b.startMs, durationMs: b.durationMs }))} 
      />
      <AudioDiagnosticsPanel activeUrl={voiceBlocks.length > 0 ? voiceBlocks[0].sourceUrl : undefined} />

      <RenderQueueReal 
        jobId={renderJobId} 
        onRenderAgain={() => setRenderJobId(undefined)} 
        onComplete={() => setRenderJobId(undefined)}
      />
      <RenderHistory projectId={projectId} />
    </>
  )
}
