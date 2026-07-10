import { getCurrentUser } from "@/utils/auth-service"
import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Settings, Save } from "lucide-react"
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20 mt-6 px-4">
      
      {/* 1. Project Settings Panel (Sticky Header) */}
      <div className="bg-slate-900 text-slate-100 rounded-xl shadow-lg border border-slate-800 p-4 sticky top-4 z-50 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/projects" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{project.title}</h1>
            <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1 font-mono">
              <span>Duration: {project.video_length}s</span>
              <span>•</span>
              <span>Aspect: 9:16</span>
              <span>•</span>
              <span>Res: 1080x1920</span>
              <span>•</span>
              <span>FPS: 30</span>
              <span>•</span>
              <span>Preset: TikTok / Reels</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700">
            <Settings className="w-4 h-4 mr-2" /> Format
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Main Workspace (Assets + Timeline) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* 2. Media Assets */}
          <ProjectMedia projectId={project.id} initialMedia={projectMedia || []} targetDuration={project.video_length} />
          
          {/* 3. Multi-Track Timeline & Inspector */}
          {projectMedia && projectMedia.length > 0 && (
            <TimelineEditor initialScenes={scenes || []} />
          )}

        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Export Settings</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground mb-1">Renderer</dt>
                <dd className="font-medium bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs font-mono">Cloud FFmpeg Worker</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1">Format</dt>
                <dd className="font-medium bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs font-mono">MP4 (H.264 / AAC)</dd>
              </div>
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
