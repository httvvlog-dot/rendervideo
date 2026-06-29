import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/utils/auth-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, ArrowRight, Play, Loader2, XCircle, AlertCircle } from "lucide-react"
import { ScriptGenerator } from "./components/script-generator"
import { ScriptCard } from "./components/script-card"

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const supabase = await createClient()
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  if (error || !project) {
    notFound()
  }

  const { data: scripts } = await supabase
    .from("scripts")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
  
  const latestScript = scripts?.[0]

  const workflow = project.workflow_state || {
    research: "pending",
    script: "pending",
    scene: "pending",
    voice: "pending",
    subtitle: "pending",
    render: "pending"
  }

  const steps = [
    { key: "research", label: "Research", icon: "🔍", state: workflow.research },
    { key: "script", label: "Scripting", icon: "✍️", state: workflow.script },
    { key: "scene", label: "Scene Selection", icon: "🖼️", state: workflow.scene },
    { key: "voice", label: "Voice Synthesis", icon: "🎙️", state: workflow.voice },
    { key: "subtitle", label: "Subtitles", icon: "📝", state: workflow.subtitle },
    { key: "render", label: "Rendering", icon: "🎬", state: workflow.render },
  ]

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    queued: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    researching: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    scripting: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    voicing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    rendering: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    cancelled: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Project ID: {project.id}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className={statusColors[project.status] || statusColors.draft} variant="secondary">
            {project.status.toUpperCase()}
          </Badge>
          <Button disabled>
            <Play className="mr-2 h-4 w-4" /> Start Generation (Sprint 3)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Timeline</CardTitle>
              <CardDescription>Track the AI generation progress step-by-step.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {steps.map((step, index) => (
                  <div key={step.key} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 bg-slate-100 dark:bg-slate-800 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      {step.state === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : step.state === "processing" || step.state === "retrying" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                      ) : step.state === "failed" ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border bg-card shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{step.icon}</span> {step.label}
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{step.state}</Badge>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-sm">
                        {step.state === "pending" && "Waiting to start..."}
                        {step.state === "processing" && "AI is currently working..."}
                        {step.state === "retrying" && "Retrying generation..."}
                        {step.state === "completed" && "Successfully completed."}
                        {step.state === "failed" && <span className="text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Task failed</span>}
                      </div>
                      
                      <div className="mt-3">
                        {step.key === "script" ? (
                          <ScriptGenerator projectId={project.id} workflowState={step.state} />
                        ) : (
                          <Button variant="secondary" size="sm" className="w-full opacity-50" disabled>
                            Run {step.label}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b">
                <span className="text-muted-foreground">Topic</span>
                <span className="font-medium truncate">{project.topic}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-2 border-b">
                <span className="text-muted-foreground">Language</span>
                <span className="font-medium">{project.language === "vi" ? "Vietnamese" : "English"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-2 border-b">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{project.video_length} minutes</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pb-2 border-b">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
          
          {latestScript && (
             <ScriptCard script={latestScript} projectId={project.id} />
          )}

          <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Sprint 3 Preview</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-400">
                In Sprint 3, you will be able to trigger individual nodes in the workflow (e.g. generate the script, review it, then generate voice) or run the entire pipeline autonomously.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
