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
  
  // Track previous playing state to detect play/pause edges
  const prevIsPlaying = useRef(isPlaying)
  // Track last known time to detect scrub events (jumps)
  const lastTimeMs = useRef(currentTimeMs)

  // 1. Initialize and cleanup audio elements
  useEffect(() => {
    const currentRefs = audioRefs.current;
    
    // Create new audio instances
    audioTracks.forEach(track => {
      if (!currentRefs[track.id]) {
        const audio = new Audio(track.sourceUrl)
        audio.preload = "auto"
        currentRefs[track.id] = audio
      }
    })

    // Remove old audio instances
    const trackIds = audioTracks.map(t => t.id)
    Object.keys(currentRefs).forEach(id => {
      if (!trackIds.includes(id)) {
        currentRefs[id].pause()
        currentRefs[id].src = ""
        currentRefs[id].load()
        delete currentRefs[id]
      }
    })

    return () => {
      Object.values(currentRefs).forEach(audio => audio.pause())
    }
  }, [audioTracks])

  // 2. Playback Sync Logic
  useEffect(() => {
    const isPlayStart = isPlaying && !prevIsPlaying.current;
    const isPauseStart = !isPlaying && prevIsPlaying.current;
    const isScrubbing = Math.abs(currentTimeMs - lastTimeMs.current) > 100 && !isPlaying;
    
    // Find active track
    const targetTrack = audioTracks.find(t => currentTimeMs >= t.startMs && currentTimeMs < t.startMs + t.durationMs);

    if (isPauseStart) {
       // Pause everything
       Object.values(audioRefs.current).forEach(audio => {
          if (!audio.paused) audio.pause();
       });
    }

    if (targetTrack) {
      const audio = audioRefs.current[targetTrack.id];
      if (audio) {
        const expectedLocalTime = (currentTimeMs - targetTrack.startMs) / 1000;
        const justSwitched = activeAudioId.current !== targetTrack.id;

        if (justSwitched) {
          // Pause previous track if necessary
          if (activeAudioId.current) {
            const oldAudio = audioRefs.current[activeAudioId.current];
            if (oldAudio) oldAudio.pause();
          }
          activeAudioId.current = targetTrack.id;
          audio.currentTime = expectedLocalTime;
          if (isPlaying) {
             audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
          }
        } else {
          // Same track, monitor synchronization
          if (isPlayStart || isScrubbing) {
            audio.currentTime = expectedLocalTime;
            if (isPlayStart) {
               audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
            }
          } else if (isPlaying) {
            const drift = Math.abs(audio.currentTime - expectedLocalTime);
            // Only resync if drift is significant (e.g., > 0.35s)
            if (drift > 0.35) {
              audio.currentTime = expectedLocalTime;
            }
            // Ensure it is playing
            if (audio.paused) {
               audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
            }
          }
        }
      }
    } else {
      // No active track -> silence
      if (activeAudioId.current) {
        const activeAudio = audioRefs.current[activeAudioId.current];
        if (activeAudio) activeAudio.pause();
        activeAudioId.current = null;
      }
    }

    // Update refs
    prevIsPlaying.current = isPlaying;
    lastTimeMs.current = currentTimeMs;

  }, [currentTimeMs, isPlaying, audioTracks])

  return null
}
