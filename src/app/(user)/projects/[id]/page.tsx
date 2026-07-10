
import { getCurrentUser } from "@/utils/auth-service"
import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Settings, CheckCircle2, Circle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { deleteProject } from "../actions"
import { TimelineEditor } from "./components/timeline-editor"
import { ProjectMedia } from "./components/project-media"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user?.id)
    .single()

  if (!project) notFound()

  const { data: scenes } = await supabase
    .from('project_scenes')
    .select('*')
    .eq('project_id', id)
    .order('sort_order', { ascending: true })

  const { data: projectMedia } = await supabase
    .from('project_media')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const wf = project.workflow_state || {
    research: "pending", script: "pending", scene: "pending", voice: "pending", subtitle: "pending", render: "pending"
  }

  const steps = [
    { key: "research", label: "Research", icon: "🔍" },
    { key: "script", label: "Script", icon: "📝" },
    { key: "voice", label: "Voice", icon: "🎙️" },
    { key: "subtitle", label: "Subtitle", icon: "💬" },
    { key: "render", label: "Render", icon: "🎬" },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
            <p className="text-sm text-muted-foreground">{project.topic}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Settings</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white"><Play className="mr-2 h-4 w-4" /> Pipeline Menu</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Generation Pipeline</h2>
            
            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3 space-y-8 py-2">
              {steps.map((step, idx) => (
                <div key={step.key} className="relative pl-8">
                  <StateIcon state={wf[step.key]} />
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium flex items-center text-slate-900 dark:text-slate-100">
                        {step.icon} {step.label}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {wf[step.key] === 'pending' && 'Waiting to start...'}
                        {wf[step.key] === 'processing' && 'Working on it...'}
                        {wf[step.key] === 'completed' && 'Completed successfully'}
                        {wf[step.key] === 'failed' && 'Error occurred'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <ProjectMedia projectId={project.id} initialMedia={projectMedia || []} />
          
          <TimelineEditor initialScenes={scenes || []} />
          
        </div>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Project Info</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Language</dt><dd className="font-medium uppercase">{project.language}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd className="font-medium">{project.video_length} mins</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-medium capitalize">{project.status}</dd></div>
            </dl>
          </div>
          
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-red-800 dark:text-red-400 uppercase tracking-wider mb-2">Danger Zone</h2>
            <p className="text-xs text-red-600 dark:text-red-500 mb-4">Once deleted, you cannot restore this project.</p>
            <form action={async () => { "use server"; await deleteProject(project.id); redirect('/projects'); }}>
              <Button type="submit" variant="destructive" className="w-full">Delete Project</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function StateIcon({ state }: { state: string }) {
  if (state === 'completed') return <CheckCircle2 className="absolute -left-[11px] top-0.5 h-6 w-6 text-green-500 bg-white dark:bg-slate-900 rounded-full" />
  if (state === 'failed') return <XCircle className="absolute -left-[11px] top-0.5 h-6 w-6 text-red-500 bg-white dark:bg-slate-900 rounded-full" />
  if (state === 'processing') return <Loader2 className="absolute -left-[11px] top-0.5 h-6 w-6 text-yellow-500 animate-spin bg-white dark:bg-slate-900 rounded-full" />
  return <Circle className="absolute -left-[11px] top-0.5 h-6 w-6 text-slate-300 dark:text-slate-700 bg-white dark:bg-slate-900 rounded-full" />
}
