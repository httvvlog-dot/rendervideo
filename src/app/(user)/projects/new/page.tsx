"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity, Check, ChevronRight, Save } from "lucide-react"

const steps = [
  { id: 1, title: "Topic" },
  { id: 2, title: "Language" },
  { id: 3, title: "Duration" },
  { id: 4, title: "Voice" },
  { id: 5, title: "Prompt" },
  { id: 6, title: "Render" },
  { id: 7, title: "Review" },
]

export default function NewProjectWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  
  // Autosave Draft State
  const [projectData, setProjectData] = useState({
    topic: "",
    language: "English",
    duration: "10", // minutes
    voiceProvider: "ElevenLabs",
    llmProvider: "Gemini",
    resolution: "1080p"
  })

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("project_draft")
    if (savedDraft) {
      setProjectData(JSON.parse(savedDraft))
    }
  }, [])

  // Autosave whenever data changes
  useEffect(() => {
    localStorage.setItem("project_draft", JSON.stringify(projectData))
  }, [projectData])

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(c => c + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(c => c - 1)
    }
  }

  // Cost Estimation Logic
  const calculateCost = () => {
    const mins = parseInt(projectData.duration) || 0
    let llmCost = projectData.llmProvider === "Gemini" ? 0.003 * mins : 0.01 * mins
    let voiceCost = projectData.voiceProvider === "ElevenLabs" ? 0.018 * mins : 0.005 * mins
    let storageCost = 0.001 * mins
    let renderCost = projectData.resolution === "1080p" ? 0.002 * mins : 0.005 * mins
    return {
      llm: llmCost.toFixed(3),
      voice: voiceCost.toFixed(3),
      storage: storageCost.toFixed(3),
      render: renderCost.toFixed(3),
      total: (llmCost + voiceCost + storageCost + renderCost).toFixed(3)
    }
  }

  const cost = calculateCost()

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
          <p className="text-muted-foreground mt-1">Design your AI video step-by-step.</p>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          {isSaving ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? "Saving..." : "Draft saved locally"}
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="relative">
        <div className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-t border-slate-200 dark:border-slate-800" />
        <ul className="relative flex justify-between">
          {steps.map((step) => (
            <li key={step.id} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background ${
                  currentStep === step.id
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-500"
                    : currentStep > step.id
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-200 text-slate-400 dark:border-slate-800"
                }`}
              >
                {currentStep > step.id ? <Check className="h-5 w-5" /> : <span className="text-sm font-medium">{step.id}</span>}
              </div>
              <span className={`text-xs font-medium ${currentStep === step.id ? "text-foreground" : "text-muted-foreground"}`}>
                {step.title}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="min-h-[400px] flex flex-col">
            <CardHeader>
              <CardTitle>Step {currentStep}: {steps[currentStep-1].title}</CardTitle>
              <CardDescription>Configure the {steps[currentStep-1].title.toLowerCase()} for your video.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">What is your video about?</Label>
                    <Input 
                      id="topic" 
                      placeholder="e.g. Top 10 space discoveries of 2024" 
                      value={projectData.topic}
                      onChange={(e) => setProjectData({...projectData, topic: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Target Duration (minutes)</Label>
                    <Input 
                      id="duration" 
                      type="number"
                      value={projectData.duration}
                      onChange={(e) => setProjectData({...projectData, duration: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {/* Placeholders for other steps */}
              {[2, 4, 5, 6].includes(currentStep) && (
                <div className="flex h-full items-center justify-center border-2 border-dashed rounded-md text-muted-foreground">
                  Configuration UI for {steps[currentStep-1].title} (Sprint 2C)
                </div>
              )}

              {currentStep === 7 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Ready to generate?</h3>
                  <p className="text-sm text-muted-foreground">Review your settings and cost estimates before starting the AI pipeline.</p>
                </div>
              )}

            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1}>
                Previous
              </Button>
              <Button onClick={handleNext} disabled={currentStep === steps.length}>
                {currentStep === steps.length - 1 ? "Review" : "Next"}
                {currentStep < steps.length - 1 && <ChevronRight className="ml-2 h-4 w-4" />}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* AI Cost Estimator Panel */}
        <div className="space-y-6">
          <Card className="bg-slate-50 dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50">
            <CardHeader>
              <CardTitle className="text-lg">AI Cost Estimator</CardTitle>
              <CardDescription>Estimated cost for a {projectData.duration} minute video.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">LLM ({projectData.llmProvider})</span>
                <span className="font-medium">${cost.llm}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Voice ({projectData.voiceProvider})</span>
                <span className="font-medium">${cost.voice}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Storage (R2)</span>
                <span className="font-medium">${cost.storage}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Render Worker</span>
                <span className="font-medium">${cost.render}</span>
              </div>
              <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
              <div className="flex justify-between font-bold">
                <span>Estimated Total</span>
                <span className="text-indigo-600 dark:text-indigo-400">≈ ${cost.total}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled={currentStep !== 7}>
                Confirm & Generate
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
