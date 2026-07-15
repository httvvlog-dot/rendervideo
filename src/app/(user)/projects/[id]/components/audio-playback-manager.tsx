"use client"

import { useEffect, useRef } from "react"

export interface AudioTrack {
  id: string
  sourceUrl: string
  startMs: number
  durationMs: number
}

interface AudioPlaybackManagerProps {
  isPlaying: boolean
  currentTimeMs: number
  audioTracks: AudioTrack[]
}

export function AudioPlaybackManager({ isPlaying, currentTimeMs, audioTracks }: AudioPlaybackManagerProps) {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const activeAudioId = useRef<string | null>(null)
  
  // Initialize audio elements for each track
  useEffect(() => {
    const currentRefs = audioRefs.current;
    audioTracks.forEach(track => {
      if (!currentRefs[track.id]) {
        const audio = new Audio(track.sourceUrl)
        audio.preload = "auto"
        currentRefs[track.id] = audio
      }
    })

    // Cleanup logic when tracks change or component unmounts
    const trackIds = audioTracks.map(t => t.id)
    Object.keys(currentRefs).forEach(id => {
      if (!trackIds.includes(id)) {
        currentRefs[id].pause()
        currentRefs[id].src = ""
        delete currentRefs[id]
      }
    })

    return () => {
      // Don't completely destroy on unmount if it remounts quickly, but we pause everything.
      Object.values(currentRefs).forEach(audio => audio.pause())
    }
  }, [audioTracks])

  // Sync playback logic
  useEffect(() => {
    // Find the track that should be playing right now
    const targetTrack = audioTracks.find(t => currentTimeMs >= t.startMs && currentTimeMs < t.startMs + t.durationMs)
    
    // Determine the exact current time the audio SHOULD be at
    // Add 100ms tolerance for sync
    if (targetTrack) {
      const expectedAudioTimeSec = (currentTimeMs - targetTrack.startMs) / 1000;
      const audio = audioRefs.current[targetTrack.id];
      if (audio) {
        // If we switched to a new track, stop the old one
        if (activeAudioId.current && activeAudioId.current !== targetTrack.id) {
           const oldAudio = audioRefs.current[activeAudioId.current];
           if (oldAudio) oldAudio.pause();
        }
        
        activeAudioId.current = targetTrack.id;

        // Sync time if difference is more than 0.2s (avoid micro-stutters)
        if (Math.abs(audio.currentTime - expectedAudioTimeSec) > 0.2) {
          audio.currentTime = expectedAudioTimeSec;
        }

        if (isPlaying) {
           // only play if it is currently paused
           if (audio.paused) {
              audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
           }
        } else {
           if (!audio.paused) {
              audio.pause();
           }
        }
      }
    } else {
      // No target track means silence right now. Stop the active audio.
      if (activeAudioId.current) {
        const activeAudio = audioRefs.current[activeAudioId.current];
        if (activeAudio) activeAudio.pause();
        activeAudioId.current = null;
      }
    }

    // Handle pausing EVERYTHING when not playing
    if (!isPlaying) {
       Object.values(audioRefs.current).forEach(audio => {
          if (!audio.paused) audio.pause();
       });
    }

  }, [currentTimeMs, isPlaying, audioTracks])

  // This is a hidden logical component
  return null
}
