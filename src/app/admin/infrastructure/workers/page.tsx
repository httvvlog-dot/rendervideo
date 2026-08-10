import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Server, Clock, CheckCircle2, AlertTriangle, XCircle, Terminal, HardDrive } from "lucide-react"
import { AutoRefresh } from "../components/auto-refresh"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export const dynamic = 'force-dynamic'

export default async function WorkersPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: workers, error } = await supabase
    .from("render_workers")
    .select("*")
    .order("last_heartbeat_at", { ascending: false })

  if (error) {
    console.error("Error fetching workers:", error)
  }

  const now = new Date()

  // Calculate stats based on TTL
  let onlineCount = 0
  let busyCount = 0
  let offlineCount = 0
  let deadCount = 0

  const processedWorkers = workers?.map(worker => {
    const lastHeartbeat = new Date(worker.last_heartbeat_at)
    const secondsAgo = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000)
    
    let computedStatus = 'ONLINE'
    let statusColor = "text-slate-500"
    let StatusIcon = Activity
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline"
    
    if (secondsAgo > 300) {
      computedStatus = 'DEAD'
      statusColor = "text-red-600 dark:text-red-400"
      StatusIcon = XCircle
      badgeVariant = "destructive"
      deadCount++
    } else if (secondsAgo > 30) {
      computedStatus = 'OFFLINE'
      statusColor = "text-slate-500"
      StatusIcon = Clock
      badgeVariant = "secondary"
      offlineCount++
    } else if (worker.active_jobs > 0) {
      computedStatus = 'BUSY'
      statusColor = "text-blue-500"
      StatusIcon = Activity
      badgeVariant = "default"
      busyCount++
    } else {
      computedStatus = 'ONLINE'
      statusColor = "text-emerald-500"
      StatusIcon = CheckCircle2
      badgeVariant = "outline"
      onlineCount++
    }

    // Override if backend explicitly says something else, though heartbeat logic dominates
    if (worker.status === 'maintenance') {
      computedStatus = 'MAINTENANCE'
      statusColor = "text-amber-500"
      badgeVariant = "outline"
    }

    let lastCompletedStr = 'Never'
    if (worker.last_job_completed_at) {
      const completedAgo = Math.floor((now.getTime() - new Date(worker.last_job_completed_at).getTime()) / 1000)
      if (completedAgo < 60) lastCompletedStr = `${completedAgo}s ago`
      else if (completedAgo < 3600) lastCompletedStr = `${Math.floor(completedAgo/60)}m ago`
      else lastCompletedStr = `${Math.floor(completedAgo/3600)}h ago`
    }

    let uptimeStr = '0s'
    if (worker.uptime_seconds) {
      const h = Math.floor(worker.uptime_seconds / 3600)
      const m = Math.floor((worker.uptime_seconds % 3600) / 60)
      const s = worker.uptime_seconds % 60
      if (h > 0) uptimeStr = `${h}h ${m}m`
      else if (m > 0) uptimeStr = `${m}m ${s}s`
      else uptimeStr = `${s}s`
    }
    
    const capacityPercent = worker.max_concurrent_jobs > 0 ? (worker.active_jobs / worker.max_concurrent_jobs) * 100 : 0;

    return { ...worker, secondsAgo, computedStatus, statusColor, StatusIcon, badgeVariant, lastCompletedStr, uptimeStr, capacityPercent }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <AutoRefresh intervalMs={5000} />
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worker Fleet</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time status of distributed rendering nodes.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{onlineCount}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Busy</CardTitle>
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">{busyCount}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
              <Clock className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{offlineCount}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dead</CardTitle>
            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-md">
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">{deadCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {processedWorkers?.map(worker => {
          const isDead = worker.computedStatus === 'DEAD';
          return (
          <Card key={worker.id} className={`overflow-hidden shadow-sm transition-all ${isDead ? 'border-red-200 dark:border-red-900/50 bg-red-50/10 dark:bg-red-950/10' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className={`h-1 w-full ${isDead ? 'bg-red-500' : worker.computedStatus === 'BUSY' ? 'bg-blue-500' : worker.computedStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-lg flex items-center gap-2 truncate">
                    <Terminal className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{worker.worker_name}</span>
                  </CardTitle>
                  <CardDescription className="mt-1 font-mono text-[11px] truncate flex items-center gap-1.5">
                    <span className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">{worker.worker_mode}</span>
                    {worker.hostname}
                  </CardDescription>
                </div>
                <Badge variant={worker.badgeVariant} className={`text-[10px] font-bold shrink-0 ${worker.computedStatus === 'ONLINE' ? 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' : worker.computedStatus === 'BUSY' ? 'bg-blue-500 text-white border-blue-500' : ''}`}>
                  {worker.computedStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-5">
                
                {/* Capacity Gauge */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Active Capacity</span>
                    <span className={worker.active_jobs === worker.max_concurrent_jobs ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}>
                      {worker.active_jobs} / {worker.max_concurrent_jobs} Jobs
                    </span>
                  </div>
                  <Progress value={worker.capacityPercent} className="h-2 [&>div]:bg-blue-500" />
                </div>

                {/* Resource Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                    <div className="text-slate-500 mb-1 text-[11px] uppercase tracking-wider font-semibold">CPU Usage</div>
                    <div className="font-mono font-medium text-slate-900 dark:text-slate-100">{worker.cpu_usage}%</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                    <div className="text-slate-500 mb-1 text-[11px] uppercase tracking-wider font-semibold">RAM Usage</div>
                    <div className="font-mono font-medium text-slate-900 dark:text-slate-100">{worker.ram_usage}%</div>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800 text-[11px] font-mono space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Uptime</span> 
                    <span className="text-slate-900 dark:text-slate-300 font-medium">{worker.uptimeStr}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Last Completed</span> 
                    <span className="text-slate-900 dark:text-slate-300 font-medium">{worker.lastCompletedStr}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">App Version</span> 
                    <span className="text-slate-900 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-1 rounded">{worker.app_version || 'N/A'}</span>
                  </div>
                </div>

                <div className={`flex items-center text-[10px] font-medium justify-between px-1 ${isDead ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Last Heartbeat: {worker.secondsAgo}s ago
                  </div>
                  <div className="flex items-center gap-1.5" title={JSON.stringify(worker.capabilities)}>
                    <HardDrive className="h-3 w-3" />
                    Cap v{worker.capabilities?.schema || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )})}
        {(!workers || workers.length === 0) && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            <Server className="h-8 w-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-medium text-slate-900 dark:text-slate-100">No render workers found</p>
            <p className="text-sm mt-1">Start a worker using `npm run worker:render`</p>
          </div>
        )}
      </div>
    </div>
  )
}
