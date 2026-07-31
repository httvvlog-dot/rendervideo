"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity, Plus, Play } from "lucide-react"
import { createProject } from "./actions"
import { useRouter } from "next/navigation"
import { VIDEO_FORMATS, VideoFormat } from "@/config/video-formats"

export default function NewProject() {
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()
  
  const [projectData, setProjectData] = useState({
    name: "",
    duration: "60",
    format: VideoFormat.VERTICAL // Dùng Enum, không dùng chuỗi
  })

  const handleCreate = async () => {
    if (!projectData.name.trim()) return
    setIsGenerating(true)
    try {
      const res = await createProject(projectData)
      if (res?.id) {
        router.push(`/projects/${res.id}`)
      }
    } catch (error) {
      console.error(error)
      setIsGenerating(false)
    }
  }

  const durationOptions = [
    { value: "30", label: "30s", desc: "Short/Reels" },
    { value: "60", label: "60s", desc: "Standard TikTok" },
    { value: "120", label: "2m", desc: "Extended" },
    { value: "240", label: "4m", desc: "Mini Vlog" },
    { value: "600", label: "10m", desc: "Full YouTube" }
  ]

  // Đọc từ cấu hình, không hardcode.
  const ENABLE_MULTI_ASPECT = process.env.NEXT_PUBLIC_ENABLE_MULTI_ASPECT === "true"

  return (
    <div className="mx-auto max-w-2xl space-y-8 mt-10 pb-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-muted-foreground mt-2">Initialize your video workspace to start editing.</p>
      </div>

      <Card className="shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b pb-6">
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Name your project and choose a target duration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-semibold">Project Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. Summer Vacation 2024" 
              className="text-lg py-6"
              value={projectData.name}
              onChange={(e) => setProjectData({...projectData, name: e.target.value})}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Target Duration</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {durationOptions.map(opt => (
                <div 
                  key={opt.value}
                  onClick={() => setProjectData({...projectData, duration: opt.value})}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    projectData.duration === opt.value 
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-600" 
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-lg">{opt.label}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      projectData.duration === opt.value ? "border-indigo-600" : "border-slate-300"
                    }`}>
                      {projectData.duration === opt.value && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              ))}
              
              <div 
                onClick={() => setProjectData({...projectData, duration: "custom"})}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  projectData.duration !== "30" && projectData.duration !== "60" && projectData.duration !== "120" && projectData.duration !== "240" && projectData.duration !== "600"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-600" 
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-lg">Custom</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    projectData.duration !== "30" && projectData.duration !== "60" && projectData.duration !== "120" && projectData.duration !== "240" && projectData.duration !== "600" ? "border-indigo-600" : "border-slate-300"
                  }`}>
                    {projectData.duration !== "30" && projectData.duration !== "60" && projectData.duration !== "120" && projectData.duration !== "240" && projectData.duration !== "600" && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                  </div>
                </div>
                {projectData.duration !== "30" && projectData.duration !== "60" && projectData.duration !== "120" && projectData.duration !== "240" && projectData.duration !== "600" ? (
                  <Input 
                    type="number" 
                    className="h-6 text-xs mt-1" 
                    placeholder="Seconds..."
                    value={projectData.duration === "custom" ? "" : projectData.duration}
                    onChange={(e) => setProjectData({...projectData, duration: e.target.value})}
                    autoFocus
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Enter manually</p>
                )}
              </div>
            </div>
          </div>

          {ENABLE_MULTI_ASPECT && (
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold">Video Format</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {VIDEO_FORMATS.map(opt => (
                  <div 
                    key={opt.value}
                    onClick={() => setProjectData({...projectData, format: opt.value})}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      projectData.format === opt.value 
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-600" 
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg flex items-center gap-2">
                        <span className="text-2xl">{opt.icon}</span> 
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                        </div>
                      </span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        projectData.format === opt.value ? "border-indigo-600" : "border-slate-300"
                      }`}>
                        {projectData.format === opt.value && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </CardContent>
        <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t p-6">
          <Button 
            className="w-full text-lg h-12 bg-indigo-600 hover:bg-indigo-700" 
            onClick={handleCreate} 
            disabled={isGenerating || !projectData.name.trim()}
          >
            {isGenerating ? (
              <><Activity className="mr-2 h-5 w-5 animate-spin" /> Creating Workspace...</>
            ) : (
              <><Play className="mr-2 h-5 w-5 fill-white" /> Create Project</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
