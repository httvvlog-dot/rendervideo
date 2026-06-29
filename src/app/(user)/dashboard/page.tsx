import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderKanban, Plus, Clock, PlayCircle, CheckCircle2, DollarSign } from "lucide-react"
import Link from "next/link"
import { getCurrentUser } from "@/utils/auth-service"
import { createClient } from "@/utils/supabase/server"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Fetch real counts
  const { count: totalProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user?.id)
  const { count: draftProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user?.id).eq('status', 'draft')
  const { count: completedProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user?.id).eq('status', 'completed')
  
  // Fetch recent projects
  const { data: recentProjects } = await supabase
    .from('projects')
    .select('id, title, status, created_at, video_length')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Calculate estimated cost (mocked aggregation for now, Sprint 3 will track real usage)
  const estimatedCost = (totalProjects || 0) * 0.15

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.full_name || user?.email}</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Create Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftProjects || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedProjects || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${estimatedCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Approx. API usage</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your most recently created videos.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentProjects && recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <Link href={`/projects/${project.id}`} key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-md">
                        <PlayCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{project.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(project.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="text-xs text-muted-foreground">{project.video_length}m</span>
                       <span className={`text-xs px-2 py-1 rounded-full ${project.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                         {project.status}
                       </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                <FolderKanban className="h-10 w-10 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No projects found</h3>
                <p className="text-sm text-slate-500 max-w-sm text-center mt-1 mb-4">
                  You haven't created any AI videos yet. Start by creating a new project.
                </p>
                <Link href="/projects/new">
                  <Button variant="outline">Create First Project</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/projects/new" className="flex items-center p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <Plus className="h-5 w-5 mr-3 text-indigo-500" />
              <div>
                <p className="font-medium">New AI Video</p>
                <p className="text-xs text-muted-foreground">Start a fresh project</p>
              </div>
            </Link>
            <div className="flex items-center p-3 border rounded-lg opacity-50 cursor-not-allowed">
              <FolderKanban className="h-5 w-5 mr-3 text-emerald-500" />
              <div>
                <p className="font-medium">Browse Templates</p>
                <p className="text-xs text-muted-foreground">Sprint 2B Feature</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
