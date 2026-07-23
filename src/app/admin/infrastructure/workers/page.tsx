import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Server, Clock, CheckCircle2, AlertTriangle, XCircle, Terminal, HardDrive } from "lucide-react"

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
    
    let computedStatus = 'online'
    let statusColor = "text-slate-500"
    let StatusIcon = Activity
    
    if (secondsAgo > 300) {
      computedStatus = 'dead'
      statusColor = "text-red-600"
      StatusIcon = XCircle
      deadCount++
    } else if (secondsAgo > 30) {
      computedStatus = 'offline'
      statusColor = "text-slate-500"
      StatusIcon = Clock
      offlineCount++
    } else if (worker.active_jobs > 0) {
      computedStatus = 'busy'
      statusColor = "text-blue-500"
      StatusIcon = Activity
      busyCount++
    } else {
      computedStatus = 'online'
      statusColor = "text-emerald-500"
      StatusIcon = CheckCircle2
      onlineCount++
    }

    return { ...worker, secondsAgo, computedStatus, statusColor, StatusIcon }
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Busy</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{busyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offlineCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dead</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deadCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {processedWorkers?.map(worker => (
          <Card key={worker.id} className="overflow-hidden">
            <div className={`h-1 w-full ${worker.statusColor.replace('text-', 'bg-')}`} />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-indigo-500" />
                    {worker.worker_name}
                  </CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs">{worker.hostname} • {worker.worker_mode}</CardDescription>
                </div>
                <div className="flex flex-col items-end">
                  <worker.StatusIcon className={`h-5 w-5 ${worker.statusColor}`} />
                  <span className={`text-[10px] uppercase font-bold mt-1 ${worker.statusColor}`}>{worker.computedStatus}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                    <div className="text-slate-500 mb-1 text-xs">CPU Usage</div>
                    <div className="font-semibold">{worker.cpu_usage}%</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                    <div className="text-slate-500 mb-1 text-xs">RAM Usage</div>
                    <div className="font-semibold">{worker.ram_usage}%</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                    <div className="text-slate-500 mb-1 text-xs">Active Jobs</div>
                    <div className="font-semibold">{worker.active_jobs} / {worker.max_concurrent_jobs}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                    <div className="text-slate-500 mb-1 text-xs">Success Rate</div>
                    <div className="font-semibold">{worker.success_rate?.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded p-2 text-xs font-mono space-y-1 text-slate-500">
                  <div className="flex justify-between"><span>App:</span> <span className="text-slate-900 dark:text-slate-300">{worker.app_version || 'N/A'}</span></div>
                  <div className="flex justify-between"><span>Worker:</span> <span className="text-slate-900 dark:text-slate-300">{worker.worker_version || 'N/A'}</span></div>
                  <div className="flex justify-between"><span>FFmpeg:</span> <span className="text-slate-900 dark:text-slate-300">{worker.ffmpeg_version || 'N/A'}</span></div>
                  <div className="flex justify-between"><span>Remotion:</span> <span className="text-slate-900 dark:text-slate-300">{worker.remotion_version || 'N/A'}</span></div>
                </div>

                <div className="flex items-center text-xs text-slate-500 gap-1 mt-2 justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Heartbeat: {worker.secondsAgo}s ago
                  </div>
                  <div className="flex items-center gap-1" title={JSON.stringify(worker.capabilities)}>
                    <HardDrive className="h-3 w-3" />
                    Capabilities
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!workers || workers.length === 0) && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed rounded-lg">
            No render workers registered yet. Start a worker using `npm run worker:render` to see it here.
          </div>
        )}
      </div>
    </div>
  )
}
