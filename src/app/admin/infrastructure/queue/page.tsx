import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ListTodo, CheckCircle2, XCircle, Loader2, Clock, AlertTriangle, AlertCircle, Copy, Info } from "lucide-react"
import { AutoRefresh } from "../components/auto-refresh"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export const dynamic = 'force-dynamic'

function formatDuration(start: string | null, end: string | null, now: Date) {
  if (!start) return "—"
  const startTime = new Date(start).getTime()
  const endTime = end ? new Date(end).getTime() : now.getTime()
  const seconds = Math.floor((endTime - startTime) / 1000)
  if (seconds < 0) return "—"
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function maskErrorMessage(error: string | null) {
  if (!error) return null;
  // Mask anything that looks like an API key or token
  return error.replace(/(sk-[a-zA-Z0-9]{20,})|(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g, '***MASKED_CREDENTIAL***')
}

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

  const pendingJobs = jobs?.filter(j => j.status === 'pending' || j.status === 'queued') || []
  const pending = pendingJobs.length
  const rendering = jobs?.filter(j => j.status === 'processing' || j.status === 'claimed' || j.status === 'downloading' || j.status === 'rendering' || j.status === 'encoding' || j.status === 'uploading' || j.status === 'preparing').length || 0
  const completed = jobs?.filter(j => j.status === 'completed').length || 0
  const failed = jobs?.filter(j => j.status === 'failed' || j.status === 'FAILED_FINAL').length || 0

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
    <div className="space-y-6 animate-in fade-in duration-500">
      <AutoRefresh intervalMs={5000} />
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Render Queue</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor rendering infrastructure and job lifecycle.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
              <ListTodo className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oldest Waiting</CardTitle>
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-md">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{oldestWaitingText}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendering</CardTitle>
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">{rendering}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{completed}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Today</CardTitle>
            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-md">
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">{failed}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
          <CardTitle>Recent Render Jobs</CardTitle>
          <CardDescription>Comprehensive monitoring of today's render tasks</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 border-b whitespace-nowrap">
              <tr>
                <th className="px-4 py-3 font-medium">Job ID</th>
                <th className="px-4 py-3 font-medium">Status & Progress</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Runtime / ETA</th>
                <th className="px-4 py-3 font-medium">Worker</th>
                <th className="px-4 py-3 font-medium">Retries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {jobs?.slice(0, 50).map((job) => {
                const isError = job.status === 'failed' || job.status === 'FAILED_FINAL';
                const isCompleted = job.status === 'completed';
                const isActive = !isError && !isCompleted && job.status !== 'pending' && job.status !== 'queued' && job.status !== 'cancelled';
                const isPending = job.status === 'pending' || job.status === 'queued';
                
                const maskedError = maskErrorMessage(job.error_message);
                const progressVal = Number(job.progress) || 0;
                const runtime = formatDuration(job.started_at, job.finished_at, now);
                
                let statusBadge;
                if (isCompleted) {
                  statusBadge = <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 uppercase text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> COMPLETED</Badge>;
                } else if (isError) {
                  statusBadge = <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 uppercase text-[10px]"><XCircle className="w-3 h-3 mr-1" /> FAILED</Badge>;
                } else if (isActive) {
                  statusBadge = <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 uppercase text-[10px]"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {job.status}</Badge>;
                } else if (isPending) {
                  statusBadge = <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 uppercase text-[10px]"><Clock className="w-3 h-3 mr-1" /> {job.status}</Badge>;
                } else {
                  statusBadge = <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 uppercase text-[10px]">{job.status}</Badge>;
                }

                return (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1.5 group">
                        <span className="font-mono text-xs text-slate-900 dark:text-slate-100 font-medium">
                          {job.id.substring(0, 8)}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <button 
                                onClick={() => navigator.clipboard.writeText(job.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent><p>Copy UUID</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(job.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-top min-w-[200px]">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          {statusBadge}
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{progressVal}%</span>
                        </div>
                        <Progress 
                          value={progressVal} 
                          className={`h-1.5 w-full ${isError ? '[&>div]:bg-red-500' : isCompleted ? '[&>div]:bg-emerald-500' : isActive ? '[&>div]:bg-blue-500' : ''}`} 
                        />
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                            {job.progress_message || '—'}
                          </span>
                          {isError && maskedError && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[300px] border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 text-red-800 dark:text-red-200 break-words">
                                  <p className="font-mono text-[10px]">{maskedError}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 max-w-[180px] truncate" title={job.projects?.title || 'Unknown'}>
                        {job.projects?.title || 'Unknown'}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {runtime}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          ETA: {job.estimated_time ? `${job.estimated_time}s` : '—'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-mono text-slate-700 dark:text-slate-300">
                        {job.worker_id ? job.worker_id.substring(0, 8) : '—'}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 align-top">
                      <Badge variant="secondary" className="font-mono text-xs bg-slate-100 dark:bg-slate-800">
                        {job.retry_count || 0}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
              {(!jobs || jobs.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <ListTodo className="h-8 w-8 text-slate-300 mb-3" />
                      <p>No render jobs in the queue today.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
