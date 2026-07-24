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
import { updateTimelineDurations } from "../timeline-actions"
import { ExportSettingsModal } from "./export-settings-modal"

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

export type SaveState = "saved" | "dirty" | "saving"

export interface TimelineDocument {
  scenes: PreviewScene[] 
  totalDurationMs: number
  version: number
  isDirty: boolean
}

function recalculateTimeline(scenes: PreviewScene[]): { scenes: PreviewScene[], totalDurationMs: number } {
  let currentTime = 0;
  const newScenes = scenes.map(scene => {
    const s = { ...scene, startTimeMs: currentTime, endTimeMs: currentTime + scene.durationMs }
    currentTime += scene.durationMs;
    return s;
  });
  return { scenes: newScenes, totalDurationMs: currentTime };
}

export function TimelineEditor({ 
  initialScenes, 
  media = [], 
  voiceMedia = [], 
  projectId, 
  sections = [],
  exportPresets = [],
  activePresetId = null
}: { 
  initialScenes: Scene[], 
  media?: any[], 
  voiceMedia?: any[], 
  projectId: string, 
  sections?: any[],
  exportPresets?: any[],
  activePresetId?: string | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [renderJobId, setRenderJobId] = useState<string | undefined>(undefined)

  // --- TIMELINE DOCUMENT STATE ---
  const [doc, setDoc] = useState<TimelineDocument>(() => {
    const normalized = normalizePreviewScenes(initialScenes, media);
    const { scenes, totalDurationMs } = recalculateTimeline(normalized);
    return {
      scenes,
      totalDurationMs,
      version: 0,
      isDirty: false
    }
  });

  const [saveState, setSaveState] = useState<SaveState>("saved");

  // History stack for Undo/Redo
  const [history, setHistory] = useState<PreviewScene[][]>([doc.scenes]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const previewScenes = doc.scenes;
  const totalDurationMs = doc.totalDurationMs;

  // Auto-Save Effect
  useEffect(() => {
    if (!doc.isDirty) return;
    
    const handler = setTimeout(async () => {
      setSaveState("saving");
      
      const updates = doc.scenes.map(s => ({
        id: s.id,
        durationMs: s.durationMs,
        startTimeMs: s.startTimeMs,
        endTimeMs: s.endTimeMs
      }));
      
      try {
        const res = await updateTimelineDurations(projectId, updates);
        if (res.success) {
           setSaveState("saved");
           setDoc(prev => ({ ...prev, isDirty: false }));
        } else {
           setSaveState("dirty");
           toast.error(res.message);
        }
      } catch (e) {
         setSaveState("dirty");
         console.error("Auto-save failed", e);
      }
    }, 2000); // 2s debounce
    
    return () => clearTimeout(handler);
  }, [doc.version, doc.isDirty, doc.scenes, projectId]);

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

  // --- UNDO / REDO & MUTATION ---
  const pushState = useCallback((newScenes: PreviewScene[]) => {
    const { scenes, totalDurationMs } = recalculateTimeline(newScenes);
    
    // Slice history to current index (discarding future redo states if we diverge)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(scenes);
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setDoc(prev => ({
      ...prev,
      scenes,
      totalDurationMs,
      version: prev.version + 1,
      isDirty: true
    }));
    setSaveState("dirty");
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const restoredScenes = history[newIndex];
      const { scenes, totalDurationMs } = recalculateTimeline(restoredScenes);
      setDoc(prev => ({
        ...prev,
        scenes,
        totalDurationMs,
        version: prev.version + 1,
        isDirty: true
      }));
      setSaveState("dirty");
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const restoredScenes = history[newIndex];
      const { scenes, totalDurationMs } = recalculateTimeline(restoredScenes);
      setDoc(prev => ({
        ...prev,
        scenes,
        totalDurationMs,
        version: prev.version + 1,
        isDirty: true
      }));
      setSaveState("dirty");
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);


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
  }, [totalDurationMs, isPlaying, currentTimeMs])

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
  }, [isPlaying, animate, currentTimeMs])

  // Listen for global pause requests (e.g. from external buttons)
  useEffect(() => {
    const handleGlobalPause = () => setIsPlaying(false);
    window.addEventListener('taovideo:pause', handleGlobalPause);
    return () => window.removeEventListener('taovideo:pause', handleGlobalPause);
  }, []);

  // 4. Timeline Editing (Drag to Resize)
  const [dragState, setDragState] = useState<{
    id: string;
    edge: 'left' | 'right';
    startX: number;
    startDurationMs: number;
    originalScenes: PreviewScene[];
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string, edge: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const scene = doc.scenes.find(s => s.id === id);
    if (!scene) return;
    setDragState({
      id, edge,
      startX: e.clientX,
      startDurationMs: scene.durationMs,
      originalScenes: [...doc.scenes]
    });
  }, [doc.scenes]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaMs = (deltaX / 20) * 1000; // 20px = 1s
    
    let newDuration = dragState.edge === 'right' 
        ? dragState.startDurationMs + deltaMs
        : dragState.startDurationMs - deltaMs;
    
    if (newDuration < 1000) newDuration = 1000;
    
    // Snapping logic
    const scene = dragState.originalScenes.find(s => s.id === dragState.id);
    const voiceBlock = voiceBlocks.find(v => v.id === scene?.sectionId);
    if (voiceBlock && scene) {
       // Since it's a Ripple edit, scene's start time remains exactly the same as in originalScenes
       const sceneStartMs = scene.startTimeMs; 
       const newEndTimeMs = sceneStartMs + newDuration;
       const voiceEndTimeMs = voiceBlock.startMs + voiceBlock.durationMs;
       if (Math.abs(newEndTimeMs - voiceEndTimeMs) <= 100) {
          newDuration = voiceEndTimeMs - sceneStartMs;
       }
    }

    const newScenes = dragState.originalScenes.map(s => 
       s.id === dragState.id ? { ...s, durationMs: Math.round(newDuration) } : s
    );
    
    const recalculated = recalculateTimeline(newScenes);
    setDoc(prev => ({
      ...prev,
      scenes: recalculated.scenes,
      totalDurationMs: recalculated.totalDurationMs
    }));
  }, [dragState, voiceBlocks]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    // Find the scene in current doc to see if it actually changed
    const currentScene = doc.scenes.find(s => s.id === dragState.id);
    if (currentScene && currentScene.durationMs !== dragState.startDurationMs) {
        pushState(doc.scenes);
    }
    setDragState(null);
  }, [dragState, doc.scenes, pushState]);

  // Fit to voice
  const handleDoubleClick = useCallback((id: string) => {
    const scene = doc.scenes.find(s => s.id === id);
    if (!scene) return;
    const voiceBlock = voiceBlocks.find(v => v.id === scene.sectionId);
    if (!voiceBlock) return;
    
    const targetDuration = voiceBlock.startMs + voiceBlock.durationMs - scene.startTimeMs;
    if (targetDuration > 0 && targetDuration !== scene.durationMs) {
      const startDuration = scene.durationMs;
      const startTime = performance.now();
      
      const animateFit = (time: number) => {
         const elapsed = time - startTime;
         const progress = Math.min(elapsed / 200, 1);
         const ease = 1 - (1 - progress) * (1 - progress);
         const currentDuration = startDuration + (targetDuration - startDuration) * ease;
         
         const newScenes = doc.scenes.map(s => 
           s.id === id ? { ...s, durationMs: Math.round(currentDuration) } : s
         );
         
         if (progress < 1) {
            const recalculated = recalculateTimeline(newScenes);
            setDoc(prev => ({ ...prev, scenes: recalculated.scenes, totalDurationMs: recalculated.totalDurationMs }));
            requestAnimationFrame(animateFit);
         } else {
            pushState(newScenes); // Final state pushed to history, also triggers doc update
         }
      }
      requestAnimationFrame(animateFit);
    }
  }, [doc.scenes, voiceBlocks, pushState]);

  // Reset to AI (Using initialScenes)
  const handleReset = useCallback((id: string) => {
    const initialScene = initialScenes.find(s => s.id === id);
    if (!initialScene) return;
    
    const newScenes = doc.scenes.map(s => 
      s.id === id ? { ...s, durationMs: Math.round(Number(initialScene.duration) * 1000) } : s
    );
    pushState(newScenes);
  }, [doc.scenes, initialScenes, pushState]);

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
    // x is the click position relative to the left edge of the VISIBLE container
    const x = e.clientX - rect.left 
    // We must add the scrollLeft to get the absolute position on the track!
    const scrollX = trackRef.current.scrollLeft
    
    // BUT wait! The left 96px are the labels. We should subtract 96px.
    const trackX = x + scrollX - 96;
    if (trackX < 0) return; // Clicked on the label
    
    // Now convert trackX to milliseconds
    const timeMs = (trackX / 20) * 1000;
    handleSeek(timeMs)
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
          
          <div className="flex items-center pl-4 border-l border-slate-300 dark:border-slate-700 ml-2">
            <span className={`text-xs font-medium flex items-center ${
              saveState === "saved" ? "text-slate-500" :
              saveState === "dirty" ? "text-amber-500" :
              "text-blue-500"
            }`}>
              {saveState === "saved" && "✓ Saved"}
              {saveState === "dirty" && "● Unsaved"}
              {saveState === "saving" && "⟳ Saving..."}
            </span>
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
        <ExportSettingsModal 
          projectId={projectId} 
          activePresetId={activePresetId || null} 
          presets={exportPresets || []}
          totalDurationMs={totalDurationMs}
        />
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

          {/* SCROLLABLE TIMELINE CONTAINER */}
          <div 
            ref={trackRef}
            onClick={handleTrackClick}
            className="flex-1 overflow-x-auto relative rounded-md border border-slate-300 dark:border-slate-800 bg-slate-200 dark:bg-[#1a1d2d] shadow-inner select-none"
          >
            <div 
              className="relative min-w-full min-h-[12rem] py-4"
              style={{ width: `max(100%, ${totalDurationMs > 0 ? (totalDurationMs / 1000) * 20 + 96 : 0}px)` }} // 20 = pixelsPerSecond, 96 = w-24
            >
              {/* Playhead Overlay */}
              <div 
                className="absolute top-0 bottom-0 w-px bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)] z-50 pointer-events-none"
                style={{ left: `${(currentTimeMs / 1000) * 20 + 96}px` }}
              >
                <div className="absolute -top-2 -left-1.5 w-3 h-3 bg-red-500 rotate-45 rounded-sm"></div>
              </div>

              {/* VIDEO TRACK (Active) */}
              <div className="flex relative z-10 mb-2" 
                onPointerMove={dragState ? handlePointerMove : undefined}
                onPointerUp={dragState ? handlePointerUp : undefined}
                onPointerLeave={dragState ? handlePointerUp : undefined}
              >
                <div className="w-24 shrink-0 sticky left-0 z-40 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 border-r border-y border-slate-300 dark:border-slate-800 px-2 rounded-r-md shadow-sm h-20">
                  <ImageIcon className="w-3 h-3 mr-1" /> Video
                </div>
                <div className="flex-1 relative h-20">
                  {previewScenes.map((scene) => {
                    const isSelected = selectedId === scene.id;
                    const voiceBlock = voiceBlocks.find(v => v.id === scene.sectionId);
                    
                    // Warning border if Video < Voice duration
                    let warningClass = "";
                    if (voiceBlock) {
                      // Note: Because scenes and voiceblocks can be 1:N or M:1, 
                      // we'll just check if this single scene is shorter than the voice block for now.
                      // Ideally we'd sum all scenes in the section, but simple is better here.
                      if (scene.durationMs < voiceBlock.durationMs - 100) {
                        warningClass = "ring-2 ring-yellow-400 ring-inset";
                      }
                    }

                    return (
                      <div
                        key={scene.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(scene.id); }}
                        onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(scene.id); }}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); handleReset(scene.id); }}
                        className={`absolute top-0 bottom-0 bg-indigo-900 border-r border-indigo-950 flex flex-col items-center justify-center text-[10px] text-white transition-colors hover:bg-indigo-800 overflow-hidden cursor-pointer
                          ${isSelected ? "bg-indigo-600 shadow-inner z-20" : "z-10"}
                          ${warningClass}
                        `}
                        style={{ 
                          left: `${(scene.startTimeMs / 1000) * 20}px`,
                          width: `${(scene.durationMs / 1000) * 20}px` 
                        }}
                        title={`Scene: ${(scene.durationMs/1000).toFixed(1)}s ${warningClass ? '(Video ends before narration)' : ''}`}
                      >
                        {scene.mediaId ? (
                           
                          <img src={scene.publicUrl || ""} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay pointer-events-none" />
                        ) : null}
                        <span className="relative z-10 drop-shadow-md truncate w-full text-center px-4 font-mono font-bold">
                          {(scene.durationMs/1000).toFixed(1)}s
                        </span>
                        
                        {/* DRAG HANDLES */}
                        {isSelected && (
                          <>
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-white/30 z-30 flex items-center justify-center"
                              onPointerDown={(e) => handlePointerDown(e, scene.id, 'left')}
                            >
                              <div className="w-1 h-4 bg-white rounded-full pointer-events-none opacity-50" />
                            </div>
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-white/30 z-30 flex items-center justify-center"
                              onPointerDown={(e) => handlePointerDown(e, scene.id, 'right')}
                            >
                              <div className="w-1 h-4 bg-white rounded-full pointer-events-none opacity-50" />
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* VOICE TRACK (Read-Only) */}
              <div className="flex relative z-0 mb-2">
                <div className="w-24 shrink-0 sticky left-0 z-40 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 border-r border-y border-slate-300 dark:border-slate-800 px-2 rounded-r-md shadow-sm h-12">
                  <Mic className="w-3 h-3 mr-1" /> Voice
                </div>
                <div className="flex-1 relative h-12">
                  {voiceBlocks.length > 0 ? voiceBlocks.map(block => (
                    <div
                      key={block.id}
                      className="absolute top-1 bottom-1 bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400 rounded flex items-center justify-center text-[10px] text-white shadow-sm overflow-hidden whitespace-nowrap px-2 transition-colors cursor-pointer"
                      style={{
                        left: `${(block.startMs / 1000) * 20}px`,
                        width: `${(block.durationMs / 1000) * 20}px`
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
              <div className="flex relative z-0 opacity-50 grayscale pointer-events-none">
                <div className="w-24 shrink-0 sticky left-0 z-40 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 border-r border-y border-slate-300 dark:border-slate-800 px-2 rounded-r-md shadow-sm h-12">
                  <Type className="w-3 h-3 mr-1" /> Subs
                </div>
                <div className="flex-1 relative h-12 flex items-center justify-center text-xs text-slate-400">
                  [ Coming Soon ]
                </div>
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
