import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Video, HardDrive, Cpu, Activity, Server, FileCode2, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"

export default async function AdminDashboard() {
  await requireAdmin()
  const supabase = await createClient()
  
  // Real database counters
  const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  
  // Use unified statistics RPC for system-wide stats
  const { data: statsRaw } = await supabase.rpc('get_user_project_statistics')
  const stats = statsRaw as any || { summary: {}, metrics: {} }
  const projectsCount = stats.summary?.total || 0
  const completedCount = stats.summary?.completed || 0

  const { count: jobsCount } = await supabase.from('job_queue').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing'])
  const { count: providersCount } = await supabase.from('providers').select('*', { count: 'exact', head: true }).eq('is_active', true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Link href="/admin/system">
            <Button variant="outline">
              <Server className="mr-2 h-4 w-4" />
              System Validation
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount || 0}</div>
            <p className="text-xs text-muted-foreground">Active platform members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanbanIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Across all stages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount || 0}</div>
            <p className="text-xs text-muted-foreground">Successfully rendered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobsCount || 0}</div>
            <p className="text-xs text-muted-foreground">In processing queue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Platform Activity</CardTitle>
            <CardDescription>System usage metrics (Sprint 3)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-dashed border-2 m-4 rounded-md">
            <div className="text-muted-foreground flex flex-col items-center">
               <Activity className="h-10 w-10 mb-2 opacity-20" />
               Activity Chart Placeholder
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/admin/system" className="flex items-center p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <Server className="h-5 w-5 mr-3 text-blue-500" />
              <div>
                <p className="font-medium">System Health</p>
                <p className="text-xs text-muted-foreground">Check connection status</p>
              </div>
            </Link>
            <Link href="/admin/providers" className="flex items-center p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <Cpu className="h-5 w-5 mr-3 text-purple-500" />
              <div>
                <p className="font-medium">Manage Providers</p>
                <p className="text-xs text-muted-foreground">{providersCount || 0} active providers</p>
              </div>
            </Link>
            <Link href="/admin/billing" className="flex items-center p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <Activity className="h-5 w-5 mr-3 text-emerald-500" />
              <div>
                <p className="font-medium">Commercial Billing</p>
                <p className="text-xs text-muted-foreground">Manage wallets & pricing</p>
              </div>
            </Link>
            <div className="flex items-center p-3 border rounded-lg opacity-50">
              <FileCode2 className="h-5 w-5 mr-3 text-orange-500" />
              <div>
                <p className="font-medium">Job Queue Logs</p>
                <p className="text-xs text-muted-foreground">Coming in Sprint 4</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FolderKanbanIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M8 10v4" />
      <path d="M12 10v2" />
      <path d="M16 10v6" />
    </svg>
  )
}