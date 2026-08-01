"use client"

import React from "react"
import { useProjectSave } from "./project-save-context"

export function ProjectSaveStatus() {
  const { saveState, lastSavedAt } = useProjectSave()



  return (
    <div className="flex items-center space-x-2 text-sm font-medium">
      {saveState === "saving" && (
        <span className="text-yellow-500 flex items-center">
          <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>
          Saving...
        </span>
      )}
      
      {saveState === "dirty" && (
        <span className="text-slate-400 flex items-center">
          <span className="w-2 h-2 rounded-full bg-slate-500 mr-2"></span>
          Unsaved changes
        </span>
      )}
      
      {saveState === "failed" && (
        <span className="text-red-500 flex items-center">
          <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
          Save failed
        </span>
      )}
      
      {saveState === "saved" && (
        <span className="text-emerald-400 flex items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
          Saved
          {lastSavedAt && (
            <span className="text-slate-500 text-xs ml-2 font-mono">
              {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </span>
      )}
    </div>
  )
}
