"use client"

import { useEffect, useState } from "react"

export function WorkflowIndicator({ 
  allVoicesGenerated, 
  hasExistingScenes 
}: { 
  allVoicesGenerated: boolean, 
  hasExistingScenes: boolean 
}) {
  const defaultStep = !allVoicesGenerated ? 1 : (!hasExistingScenes ? 2 : 3)
  const [activeStep, setActiveStep] = useState(defaultStep)

  // Update when props change (server action completed)
  useEffect(() => {
    setActiveStep(defaultStep)
  }, [defaultStep])

  // Listen for overrides from buttons
  useEffect(() => {
    const handleOverride = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number }>;
      setActiveStep(customEvent.detail.step);
    }
    window.addEventListener('taovideo:workflow-step', handleOverride);
    return () => window.removeEventListener('taovideo:workflow-step', handleOverride);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-md border">
      <span className="font-bold text-slate-700 dark:text-slate-300">Workflow:</span>
      <span className={activeStep === 1 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>Step 1: Generate Voice</span>
      <span>→</span>
      <span className={activeStep === 2 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>Step 2: Sync Timeline</span>
      <span>→</span>
      <span className={activeStep === 3 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>
        Step 3: {hasExistingScenes ? "Rebuild Timeline" : "Generate Timeline"}
      </span>
    </div>
  )
}
