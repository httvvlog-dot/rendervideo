"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useProjectSave } from "./project-save-context"

export function ProjectBackButton() {
  const router = useRouter()
  const { saveState, flushPendingSave } = useProjectSave()
  const [isFlushing, setIsFlushing] = useState(false)

  const handleBack = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (saveState !== "saved") {
      setIsFlushing(true)
      await flushPendingSave()
    }
    
    router.push('/projects')
  }

  return (
    <button 
      onClick={handleBack}
      disabled={isFlushing}
      className={`text-slate-400 hover:text-white transition-colors flex items-center ${isFlushing ? 'opacity-50 cursor-wait' : ''}`}
      aria-label="Back to projects"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  )
}
