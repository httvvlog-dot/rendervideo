const fs = require('fs');
const path = require('path');

// 1. Delete old actions
const oldActions = path.join(process.cwd(), 'src/app/(user)/projects/new/actions.ts');
if (fs.existsSync(oldActions)) {
  fs.unlinkSync(oldActions);
  console.log('[OK] Deleted old actions.ts in projects/new');
}

// 2. Patch projects/new/page.tsx
const newPagePath = path.join(process.cwd(), 'src/app/(user)/projects/new/page.tsx');
if (fs.existsSync(newPagePath)) {
  let content = fs.readFileSync(newPagePath, 'utf8');
  content = content.replace('import { createProject } from "./actions"', 'import { createProject } from "../actions"');
  fs.writeFileSync(newPagePath, content, 'utf8');
  console.log('[OK] Patched projects/new/page.tsx');
}

// 3. Create projects/page.tsx (List View)
const listPagePath = path.join(process.cwd(), 'src/app/(user)/projects/page.tsx');
const listPageContent = `
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Video, Clock, MoreVertical, Copy, Trash, PlayCircle } from "lucide-react"
import Link from "next/link"
import { getCurrentUser } from "@/utils/auth-service"
import { createClient } from "@/utils/supabase/server"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { deleteProject, duplicateProject } from "./actions"

export default async function ProjectsPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, topic, status, created_at, video_length')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your video generation pipeline.</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <Card className="border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Video className="h-12 w-12 text-indigo-500 mb-4 opacity-50" />
            <h2 className="text-xl font-bold">No projects yet</h2>
            <p className="text-muted-foreground mt-2 max-w-md mb-6">
              You haven't created any video projects. Start your first AI video creation journey now.
            </p>
            <Link href="/projects/new">
              <Button variant="outline">Create your first video</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            <Card key={project.id} className="hover:border-indigo-500/50 transition-colors flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-1">{project.title}</CardTitle>
                    <CardDescription className="line-clamp-1">{project.topic}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <form action={async () => { "use server"; await duplicateProject(project.id); }}>
                        <button type="submit" className="w-full text-left flex items-center px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm">
                          <Copy className="h-4 w-4 mr-2" /> Duplicate
                        </button>
                      </form>
                      <form action={async () => { "use server"; await deleteProject(project.id); }}>
                        <button type="submit" className="w-full text-left flex items-center px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-sm">
                          <Trash className="h-4 w-4 mr-2" /> Delete
                        </button>
                      </form>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-4 flex-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1.5" />
                  {project.video_length} minutes
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <ActivityIndicator status={project.status} />
                </div>
              </CardContent>
              <div className="px-6 pb-6 pt-0 mt-auto">
                <Link href={\`/projects/\${project.id}\`}>
                  <Button className="w-full" variant="secondary">
                    Open Workspace <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityIndicator({ status }: { status: string }) {
  if (status === 'completed') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</span>
  if (status === 'draft') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">Draft</span>
  if (status === 'failed') return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Failed</span>
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Processing</span>
}

import { ChevronRight } from "lucide-react"
`;
fs.writeFileSync(listPagePath, listPageContent, 'utf8');
console.log('[OK] Created projects/page.tsx');

// 4. Create projects/[id]/page.tsx (Detail View + Workflow UI)
const detailPageDir = path.join(process.cwd(), 'src/app/(user)/projects/[id]');
if (!fs.existsSync(detailPageDir)) fs.mkdirSync(detailPageDir, { recursive: true });

const detailPagePath = path.join(detailPageDir, 'page.tsx');
const detailPageContent = `
import { getCurrentUser } from "@/utils/auth-service"
import { createClient } from "@/utils/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Settings, CheckCircle2, Circle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { deleteProject } from "../actions"

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user?.id)
    .single()

  if (!project) notFound()

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
    <div className="mx-auto max-w-5xl space-y-6">
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
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white"><Play className="mr-2 h-4 w-4" /> Start Generation</Button>
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
                    {wf[step.key] === 'completed' && <Button variant="ghost" size="sm">View</Button>}
                  </div>
                </div>
              ))}
            </div>

          </div>
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
`;
fs.writeFileSync(detailPagePath, detailPageContent, 'utf8');
console.log('[OK] Created projects/[id]/page.tsx');

// 5. Update Dashboard to make Recent Projects clickable
const dashboardPath = path.join(process.cwd(), 'src/app/(user)/dashboard/page.tsx');
if (fs.existsSync(dashboardPath)) {
  let dbContent = fs.readFileSync(dashboardPath, 'utf8');
  
  const oldRecent = /<div key=\{project\.id\} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50\\/50 dark:bg-slate-900\\/50">([\\s\\S]*?)<\\/div>/g;
  const newRecent = `
              <Link href={\`/projects/\${project.id}\`} key={project.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-500/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                    <PlayCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium">{project.title}</p>
                    <p className="text-sm text-muted-foreground">{new Date(project.created_at).toLocaleDateString()} • {project.video_length} mins</p>
                  </div>
                </div>
                <div className="text-sm font-medium capitalize flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  {project.status}
                </div>
              </Link>`;
              
  dbContent = dbContent.replace(oldRecent, newRecent);
  fs.writeFileSync(dashboardPath, dbContent, 'utf8');
  console.log('[OK] Patched dashboard/page.tsx to use Links');
}
