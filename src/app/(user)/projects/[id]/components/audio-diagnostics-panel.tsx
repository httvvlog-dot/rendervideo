"use client"

import { useState, useEffect } from "react"
import { globalAudioEngine } from "@/utils/audio/audio-engine"
import { globalAudioCache } from "@/utils/audio/audio-cache"

export function AudioDiagnosticsPanel({ activeUrl }: { activeUrl?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const [logs, setLogs] = useState<string[]>([])
  const [diagState, setDiagState] = useState({
    contextRunning: false,
    toneTested: false,
    mp3Fetched: false,
    decodeSuccess: false,
    bufferValid: false,
    sourceCreated: false,
    gainConnected: false,
    destConnected: false,
    startExecuted: false,
  })

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0,8)} - ${msg}`])
  }

  const runFullDiagnostic = async () => {
    setLogs([])
    addLog("--- STARTING AUDIO DIAGNOSTIC ---")
    const ctx = globalAudioEngine.getContext()
    
    // 1. Context Running
    if (ctx.state === 'suspended') {
      addLog("Context is suspended. Attempting resume...")
      await ctx.resume()
    }
    const isRunning = ctx.state === 'running'
    setDiagState(prev => ({ ...prev, contextRunning: isRunning }))
    addLog(`AudioContext State: ${ctx.state}`)

    if (!isRunning) {
      addLog("FAIL: Cannot proceed. Context is not running. (Browser autoplay policy?)")
      return
    }

    // 2. Test Tone (440Hz)
    try {
      addLog("Testing 440Hz Oscillator...")
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.5) // play for 0.5s
      
      setDiagState(prev => ({ ...prev, toneTested: true }))
      addLog("Oscillator played for 0.5s. Did you hear a beep?")
    } catch (e: any) {
      addLog(`FAIL: Oscillator test threw error: ${e.message}`)
    }

    // 3. Test MP3 Fetch & Decode
    const TEST_URL = activeUrl || "https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg" // Use a reliable audio file
    addLog(`Testing AudioCache Fetch on URL:`)
    addLog(`${TEST_URL}`)
    addLog(`Current Origin: ${window.location.origin}`)
    
    try {
      const res = await fetch(TEST_URL)
      
      // Log headers
      const status = res.status
      const contentType = res.headers.get("content-type") || "unknown"
      const contentLength = res.headers.get("content-length") || "unknown"
      
      addLog(`HTTP Status: ${status} ${res.statusText}`)
      addLog(`Final URL: ${res.url.substring(0, 60)}...`)
      addLog(`Content-Type: ${contentType}`)
      addLog(`Content-Length Header: ${contentLength}`)

      // Peek at first 200 bytes as text to check for XML/JSON errors from R2
      const clonedRes = res.clone()
      const textPreview = (await clonedRes.text()).substring(0, 200)
      addLog(`Body Preview: ${textPreview.replace(/\n/g, ' ')}`)

      if (!res.ok) {
        addLog(`FAIL: Fetch returned HTTP ${status}`)
        return
      }

      if (!contentType.includes("audio/") && !contentType.includes("video/") && contentType !== "application/octet-stream") {
        addLog(`WARNING: Content-Type is ${contentType}, expected audio/*`)
      }

      setDiagState(prev => ({ ...prev, mp3Fetched: true }))
      addLog("MP3 Fetched successfully.")

      const arrayBuffer = await res.arrayBuffer()
      addLog(`ArrayBuffer size: ${arrayBuffer.byteLength} bytes`)
      
      if (arrayBuffer.byteLength < 1024) {
        addLog(`FAIL: ArrayBuffer is too small (${arrayBuffer.byteLength} bytes) to be a valid MP3!`)
        return
      }

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      setDiagState(prev => ({ ...prev, decodeSuccess: true }))
      addLog("decodeAudioData() success.")

      if (audioBuffer && audioBuffer.duration > 0) {
        setDiagState(prev => ({ ...prev, bufferValid: true }))
        addLog(`AudioBuffer valid. Duration: ${audioBuffer.duration}s`)
      } else {
        addLog("FAIL: AudioBuffer invalid or 0 duration.")
        return
      }

      // 4. Source Creation & Routing
      const source = ctx.createBufferSource()
      if (source) {
        setDiagState(prev => ({ ...prev, sourceCreated: true }))
        addLog("SourceNode created.")
      }

      const gain = ctx.createGain()
      source.connect(gain)
      setDiagState(prev => ({ ...prev, gainConnected: true }))
      addLog("Source connected to GainNode.")

      gain.connect(ctx.destination)
      setDiagState(prev => ({ ...prev, destConnected: true }))
      addLog("GainNode connected to Destination.")

      source.buffer = audioBuffer
      source.start(ctx.currentTime)
      setDiagState(prev => ({ ...prev, startExecuted: true }))
      addLog("source.start() executed successfully.")
      
      addLog("--- DIAGNOSTIC COMPLETE ---")

    } catch (e: any) {
      addLog(`FAIL during Fetch/Decode pipeline: ${e.name} - ${e.message}`)
      addLog(`Stack: ${e.stack ? e.stack.substring(0, 100) : 'none'}`)
    }
  }

  // Keyboard shortcut Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        setIsOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-black/95 border-l border-emerald-900 text-emerald-400 p-4 font-mono text-xs z-[100] flex flex-col shadow-2xl">
      <div className="flex justify-between items-center mb-4 border-b border-emerald-800 pb-2">
        <h2 className="text-sm font-bold uppercase">Audio Engine Diagnostics</h2>
        <button onClick={() => setIsOpen(false)} className="text-red-400 hover:text-red-300">Close</button>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between"><span>AudioContext Running</span> <span>{diagState.contextRunning ? '✓' : '✗'}</span></div>
        <div className="flex justify-between"><span>Test Tone (440Hz)</span> <span>{diagState.toneTested ? '✓' : '✗'}</span></div>
        <div className="flex justify-between"><span>MP3 Fetch</span> <span>{diagState.mp3Fetched ? '✓' : '✗'}</span></div>
        <div className="flex justify-between"><span>DecodeAudioData</span> <span>{diagState.decodeSuccess ? '✓' : '✗'}</span></div>
        <div className="flex justify-between"><span>Buffer Validity</span> <span>{diagState.bufferValid ? '✓' : '✗'}</span></div>
        <div className="flex justify-between"><span>Source Creation</span> <span>{diagState.sourceCreated ? '✓' : '✗'}</span></div>
        <div className="flex justify-between"><span>Gain Routing</span> <span>{diagState.gainConnected ? '✓' : '✗'}</span></div>
        <div className="flex justify-between"><span>Dest Connection</span> <span>{diagState.destConnected ? '✓' : '✗'}</span></div>
        <div className="flex justify-between"><span>Source Start</span> <span>{diagState.startExecuted ? '✓' : '✗'}</span></div>
      </div>

      <button 
        onClick={runFullDiagnostic}
        className="w-full bg-emerald-900 hover:bg-emerald-800 text-white py-2 mb-4 font-bold border border-emerald-700"
      >
        RUN DIAGNOSTIC
      </button>

      <div className="flex-1 overflow-auto bg-black/50 p-2 border border-emerald-900/50">
        {logs.map((log, i) => (
          <div key={i} className={log.includes('FAIL') ? 'text-red-400' : 'text-emerald-500'}>
            {log}
          </div>
        ))}
      </div>
    </div>
  )
}
