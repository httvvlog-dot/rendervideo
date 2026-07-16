"use client"

import { useEffect, useRef, useState } from "react"
import { globalAudioEngine, AudioTrackInput } from "@/utils/audio/audio-engine"

interface AudioPlaybackManagerProps {
  isPlaying: boolean
  currentTimeMs: number
  audioTracks: AudioTrackInput[]
}

export function AudioPlaybackManager({ isPlaying, currentTimeMs, audioTracks }: AudioPlaybackManagerProps) {
  const prevIsPlaying = useRef(isPlaying)
  const lastTimeMs = useRef(currentTimeMs)
  const [metrics, setMetrics] = useState(globalAudioEngine.getMetrics())

  // 1. Sync tracks with engine
  useEffect(() => {
    globalAudioEngine.syncTracks(audioTracks)
  }, [audioTracks])

  // 2. Playback Sync Logic
  useEffect(() => {
    const isPlayStart = isPlaying && !prevIsPlaying.current;
    const isPauseStart = !isPlaying && prevIsPlaying.current;
    
    // A scrub is when time jumps significantly while paused.
    // If we are playing, the Timeline component naturally increments currentTimeMs,
    // which shouldn't trigger a seek unless drift is huge (handled inside engine).
    const timeDelta = Math.abs(currentTimeMs - lastTimeMs.current);
    const isScrubbing = timeDelta > 100 && !isPlaying;
    const isJumpWhilePlaying = timeDelta > 500 && isPlaying; // User clicked elsewhere on timeline while playing

    if (isPlayStart) {
      globalAudioEngine.play(currentTimeMs);
    } else if (isPauseStart) {
      globalAudioEngine.pause();
    } else if (isScrubbing || isJumpWhilePlaying) {
      globalAudioEngine.seek(currentTimeMs);
    }

    prevIsPlaying.current = isPlaying;
    lastTimeMs.current = currentTimeMs;

  }, [currentTimeMs, isPlaying])

  // 3. Cleanup on unmount
  useEffect(() => {
    return () => {
      globalAudioEngine.cleanup();
    }
  }, [])

  // 4. Debug Metrics (Optional, hit Ctrl+Shift+D to toggle in future)
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(globalAudioEngine.getMetrics());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hidden debug overlay for development
  return (
    <div id="audio-metrics-debugger" className="hidden fixed bottom-4 right-4 bg-black/80 text-green-400 p-4 rounded-lg font-mono text-xs z-50 pointer-events-none">
      <div>AudioCtx: {metrics.state}</div>
      <div>Active Nodes: {metrics.activeNodes}</div>
      <div>Ctx Time: {metrics.currentTime.toFixed(2)}s</div>
      <div>Sample Rate: {metrics.sampleRate}Hz</div>
    </div>
  )
}
