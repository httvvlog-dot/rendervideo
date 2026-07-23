import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ListTodo, CheckCircle2, XCircle, PlayCircle, Loader2, Clock } from "lucide-react"

export default async function QueuePage() {
  await requireAdmin()
  const supabase = await createClient()

  // Fetch jobs for today
  const today = new Date()
  today.setHours(0,0,0,0)
  const now = new Date()

  const { data: jobs, error } = await supabase
    .from("render_jobs")
    .select("*, projects(title)")
    .gte("created_at", today.toISOString())
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching jobs:", error)
  }

  const pendingJobs = jobs?.filter(j => j.status === 'pending') || []
  const pending = pendingJobs.length
  const rendering = jobs?.filter(j => j.status === 'processing').length || 0
  const completed = jobs?.filter(j => j.status === 'completed').length || 0
  const failed = jobs?.filter(j => j.status === 'failed').length || 0

  let oldestWaitingText = "-"
  if (pendingJobs.length > 0) {
    const oldest = pendingJobs.reduce((prev, current) => {
      return (new Date(prev.created_at) < new Date(current.created_at)) ? prev : current
    })
    const waitSeconds = Math.floor((now.getTime() - new Date(oldest.created_at).getTime()) / 1000)
    if (waitSeconds > 60) {
      oldestWaitingText = `${Math.floor(waitSeconds / 60)}m ${waitSeconds % 60}s`
    } else {
      oldestWaitingText = `${waitSeconds}s`
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <ListTodo className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oldest Waiting</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{oldestWaitingText}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendering</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rendering}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Render Jobs</CardTitle>
          <CardDescription>Render jobs requested today.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500">ID</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Project</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Worker</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs?.slice(0, 50).map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-mono text-xs">{job.id.substring(0, 8)}...</td>
                    <td className="px-4 py-3">{job.projects?.title || 'Unknown'}</td>
                    <td className="px-4 py-3">{job.worker_id || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        job.status === 'failed' ? 'bg-red-100 text-red-800' :
                        job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(job.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
                {(!jobs || jobs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No render jobs in the queue today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
