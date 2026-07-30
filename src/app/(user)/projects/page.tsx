import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderKanban, PlayCircle } from "lucide-react"
import Link from "next/link"
import { getCurrentUser } from "@/utils/auth-service"
import { createClient } from "@/utils/supabase/server"

export default async function ProjectsPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Fetch completed projects from the canonical lifecycle view
  const { data: completedProjects } = await supabase
    .from('vw_project_lifecycle_status')
    .select('*')
    .eq('user_id', user?.id)
    .eq('lifecycle_status', 'COMPLETED')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
        <p className="text-muted-foreground mt-1">View and manage your completed AI video projects.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed Projects</CardTitle>
          <CardDescription>Your finished AI videos.</CardDescription>
        </CardHeader>
        <CardContent>
          {completedProjects && completedProjects.length > 0 ? (
            <div className="space-y-4">
              {completedProjects.map((project: any) => (
                <Link href={`/projects/${project.project_id}`} key={project.project_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-md">
                      <PlayCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{project.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Last render: {new Date(project.last_completed_at || project.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                     <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
                       {project.lifecycle_status}
                     </span>
                     {project.latest_resolution && (
                       <span className="text-[10px] text-muted-foreground">{project.latest_resolution} • {Math.round(project.latest_output_duration / 1000)}s</span>
                     )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
              <FolderKanban className="h-10 w-10 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No completed projects found</h3>
              <p className="text-sm text-slate-500 max-w-sm text-center mt-1 mb-4">
                You haven't completed any AI videos yet.
              </p>
              <Link href="/projects/new">
                <Button variant="outline">Create First Project</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
