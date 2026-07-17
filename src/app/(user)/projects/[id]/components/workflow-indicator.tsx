"use client"

import { useEffect, useState } from "react"

// Centralized hook to manage the active step across components
export function useWorkflowStep(allVoicesGenerated: boolean, hasExistingScenes: boolean) {
  // Determine default step based on project state
  // If voices not generated -> Step 1
  // If voices generated but no scenes -> Step 3 (Generate Timeline)
  // If voices generated and scenes exist -> Step 1 (Rest state, waiting for user to regenerate if needed)
  const defaultStep = !allVoicesGenerated ? 1 : (!hasExistingScenes ? 3 : 1);
  const [activeStep, setActiveStep] = useState(defaultStep);

  // Sync with default if it fundamentally changes (e.g., initial load)
  useEffect(() => {
    setActiveStep(defaultStep);
  }, [defaultStep]);

  // Listen to global events for step overrides
  useEffect(() => {
    const handleOverride = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number }>;
      setActiveStep(customEvent.detail.step);
    }
    window.addEventListener('taovideo:workflow-step', handleOverride);
    return () => window.removeEventListener('taovideo:workflow-step', handleOverride);
  }, []);

  const setStep = (step: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taovideo:workflow-step', { detail: { step } }));
    }
  };

  return { activeStep, setStep };
}

export function WorkflowIndicator({ 
  allVoicesGenerated, 
  hasExistingScenes 
}: { 
  allVoicesGenerated: boolean, 
  hasExistingScenes: boolean 
}) {
  const { activeStep } = useWorkflowStep(allVoicesGenerated, hasExistingScenes);

  return (
    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-md border">
      <span className="font-bold text-slate-700 dark:text-slate-300">Workflow:</span>
      <span className={activeStep === 1 ? "text-blue-600 dark:text-blue-400 font-bold" : "opacity-50"}>Step 1: Generate Voice</span>
      <span className="opacity-50">→</span>
      <span className={activeStep === 2 ? "text-blue-600 dark:text-blue-400 font-bold" : "opacity-50"}>Step 2: Sync Timeline</span>
      <span className="opacity-50">→</span>
      <span className={activeStep === 3 ? "text-blue-600 dark:text-blue-400 font-bold" : "opacity-50"}>
        Step 3: {hasExistingScenes ? "Rebuild Timeline" : "Generate Timeline"}
      </span>
    </div>
  )
}
