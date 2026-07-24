"use client"

import { useMemo } from "react"
import { PreviewScene } from "@/utils/timeline/normalize-preview-scenes"
import { AlertCircle, Image as ImageIcon } from "lucide-react"

interface ClientPreviewPlayerProps {
  scenes: PreviewScene[]
  currentTimeMs: number
  aspectRatio?: string // e.g. "9/16"
}

export function ClientPreviewPlayer({ scenes, currentTimeMs, aspectRatio = "9/16" }: ClientPreviewPlayerProps) {
  
  // Find the active scene(s). We might need 2 scenes if crossfading.
  // We use linear search since timelines are small in this sprint.
  const activeScenes = useMemo(() => {
    return scenes.filter(scene => {
      // Scene is active if currentTime is within its boundaries.
      // Special case: if currentTimeMs exactly equals total duration, show the last scene.
      // However, if the user seeks exactly to the end, it might fall out of strict < bounds.
      if (currentTimeMs >= scene.startTimeMs && currentTimeMs < scene.endTimeMs) {
        return true
      }
      return false
    })
  }, [scenes, currentTimeMs])

  // Handle exact end-of-timeline edge case
  const displayScenes = activeScenes.length > 0 
    ? activeScenes 
    : (scenes.length > 0 && currentTimeMs >= scenes[scenes.length - 1].endTimeMs ? [scenes[scenes.length - 1]] : [])

  if (scenes.length === 0) {
    return (
      <div 
        className="bg-black flex items-center justify-center rounded-xl overflow-hidden shadow-lg border border-slate-800"
        style={{ aspectRatio }}
      >
        <div className="text-slate-600 flex flex-col items-center">
          <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-sm">Empty Timeline</span>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="bg-black relative rounded-xl overflow-hidden shadow-lg border border-slate-800"
      style={{ aspectRatio }}
    >
      {displayScenes.length === 0 ? (
        <div className="absolute inset-0 bg-black flex items-center justify-center text-white">
           {/* Black frame between gaps if any */}
        </div>
      ) : (
        displayScenes.map(scene => {
          
          // Calculate progress for Ken Burns
          let sceneProgress = (currentTimeMs - scene.startTimeMs) / scene.durationMs
          if (sceneProgress < 0) sceneProgress = 0
          if (sceneProgress > 1) sceneProgress = 1

          // Interpolate CSS transform
          const currentScale = scene.startScale + (scene.endScale - scene.startScale) * sceneProgress
          const currentX = scene.startX + (scene.endX - scene.startX) * sceneProgress
          const currentY = scene.startY + (scene.endY - scene.startY) * sceneProgress

          // Calculate Transition Opacity
          let currentOpacity = scene.opacity
          
          // If a transition exists and we are at the end of the scene
          if (scene.transitionType === 'fade' || scene.transitionType === 'crossfade') {
             const transitionStartMs = scene.endTimeMs - scene.transitionDurationMs
             if (currentTimeMs > transitionStartMs && scene.transitionDurationMs > 0) {
                const fadeProgress = (currentTimeMs - transitionStartMs) / scene.transitionDurationMs
                currentOpacity = scene.opacity * (1 - fadeProgress)
             }
             
             // If we are at the START of a scene that was crossfaded into?
             // Actually, a simple implementation: crossfade usually overlaps.
             // If crossfade timing isn't modifying project_scenes duration, we just fade out the outgoing.
             // And if the incoming scene also has a transition? 
             // We'll keep it simple: just fade out if we are in the transition window of THIS scene.
          }

          if (!scene.publicUrl) {
            return (
              <div key={scene.id} className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-red-400 z-10">
                <AlertCircle className="w-10 h-10 mb-2" />
                <span className="text-sm font-semibold">Missing Media</span>
                <span className="text-xs opacity-70 truncate px-4 w-full text-center">ID: {scene.mediaId}</span>
              </div>
            )
          }

          return (
             
            <img
              key={scene.id}
              src={scene.publicUrl}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover origin-center"
              style={{
                transform: `scale(${currentScale}) translate(${currentX}%, ${currentY}%)`,
                opacity: currentOpacity,
                // We do NOT use css transition property here because requestAnimationFrame dictates the exact frame.
              }}
            />
          )
        })
      )}
    </div>
  )
}
