"use client"

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react"

export type SaveState = "saved" | "dirty" | "saving" | "failed"

interface ProjectSaveContextType {
  saveState: SaveState;
  lastSavedAt: Date | null;
  syncSaveState: (state: SaveState, time?: Date) => void;
  registerFlush: (fn: () => Promise<void>) => void;
  flushPendingSave: () => Promise<void>;
}

const ProjectSaveContext = createContext<ProjectSaveContextType | null>(null)

export function ProjectSaveProvider({ children }: { children: React.ReactNode }) {
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  
  const flushFnRef = useRef<(() => Promise<void>) | null>(null)
  const isSavingRef = useRef(false)
  const currentPromiseRef = useRef<Promise<void> | null>(null)

  const syncSaveState = useCallback((state: SaveState, time?: Date) => {
    setSaveState(state)
    if (time) setLastSavedAt(time)
  }, [])

  const registerFlush = useCallback((fn: () => Promise<void>) => {
    flushFnRef.current = fn
  }, [])

  const flushPendingSave = async () => {
    // Prevent overlapping saves
    if (isSavingRef.current && currentPromiseRef.current) {
      await currentPromiseRef.current;
      return;
    }
    
    if (flushFnRef.current) {
      isSavingRef.current = true;
      currentPromiseRef.current = flushFnRef.current().finally(() => {
        isSavingRef.current = false;
        currentPromiseRef.current = null;
      });
      await currentPromiseRef.current;
    }
  }

  // Handle beforeunload to warn user if closing tab while dirty/saving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving") {
        e.preventDefault()
        e.returnValue = "" // Required for older browsers
        return ""
      }
    }
    
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [saveState])

  return (
    <ProjectSaveContext.Provider 
      value={{ saveState, lastSavedAt, syncSaveState, registerFlush, flushPendingSave }}
    >
      {children}
    </ProjectSaveContext.Provider>
  )
}

export function useProjectSave() {
  const context = useContext(ProjectSaveContext)
  if (!context) {
    throw new Error("useProjectSave must be used within a ProjectSaveProvider")
  }
  return context
}
