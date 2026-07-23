import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Server, Clock, CheckCircle2, TrendingUp, BarChart4 } from "lucide-react"
import { AutoRefresh } from "../components/auto-refresh"

export default async function MetricsPage() {
  await requireAdmin()
  const supabase = await createClient()

  // In a real app we'd aggregate over time, here we just read worker states
  const { data: workers, error } = await supabase
    .from("render_workers")
    .select("cpu_usage, ram_usage, average_render_time, total_jobs, active_jobs, max_concurrent_jobs")

  if (error) {
    console.error("Error fetching workers metrics:", error)
  }

  const { data: recentJobs } = await supabase
    .from("render_jobs")
    .select("created_at")
    .gte("created_at", new Date(Date.now() - 3600000).toISOString())
    
  const jobsPerHour = recentJobs?.length || 0

  let avgRenderTime = 0
  let totalJobs = 0
  let totalActive = 0
  let totalMax = 0
  
  if (workers && workers.length > 0) {
    let sumTime = 0
    let validWorkers = 0
    workers.forEach(w => {
      if (w.average_render_time > 0) {
        sumTime += w.average_render_time
        validWorkers++
      }
      totalJobs += w.total_jobs
      totalActive += w.active_jobs
      totalMax += w.max_concurrent_jobs
    })
    if (validWorkers > 0) {
      avgRenderTime = sumTime / validWorkers
    }
  }

  const utilization = totalMax > 0 ? (totalActive / totalMax) * 100 : 0

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={5000} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs / Hour</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobsPerHour}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on last 60 minutes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Render Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgRenderTime)}s</div>
            <p className="text-xs text-muted-foreground mt-1">Global average across workers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worker Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilization.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{totalActive} / {totalMax} slots active</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs Served</CardTitle>
            <Server className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime total across cluster</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart4 className="h-5 w-5 text-slate-500" />
            Cluster Metrics
          </CardTitle>
          <CardDescription>Advanced metrics require Prometheus/Grafana integration. This is a basic overview.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center border border-dashed rounded-lg bg-slate-50 dark:bg-slate-900">
          <div className="text-slate-500 text-sm">
            Detailed time-series graphs will be available in future iterations.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
