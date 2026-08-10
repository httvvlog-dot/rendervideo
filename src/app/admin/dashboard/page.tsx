import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Video, DollarSign, Activity, Server, FileCode2, Clock, CheckCircle, TrendingUp, CreditCard, AlertTriangle, AlertCircle, Cpu, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"

export default async function AdminDashboard() {
  await requireAdmin()
  const supabase = await createClient()
  
  // Real database global stats
  const { data: statsRaw, error } = await supabase.rpc('get_admin_global_statistics')
  const stats = statsRaw as any || { financial: {}, operational: {} }
  const financial = stats.financial || {}
  const operational = stats.operational || {}

  const { count: providersCount } = await supabase.from('providers').select('*', { count: 'exact', head: true }).eq('is_active', true)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500">
            System Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Overview of Hatara Studio's operational and financial health.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/admin/system">
            <Button variant="outline" className="shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
              <Server className="mr-2 h-4 w-4 text-indigo-500" />
              System Validation
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" /> Financial Performance
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-50">Total Revenue (VND)</CardTitle>
              <div className="p-1.5 bg-white/20 rounded-md backdrop-blur-sm">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{(financial.revenue_total_vnd || 0).toLocaleString()} ₫</div>
              <p className="text-xs text-indigo-100 mt-1 flex items-center gap-1 opacity-90">
                <TrendingUp className="w-3 h-3" /> From successful orders
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Provider Costs (USD)</CardTitle>
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-md">
                <Server className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Number(financial.provider_cost_usd || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">API usage expenses</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit (Est. USD)</CardTitle>
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${Number(financial.gross_profit_estimate_usd || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Revenue - API Costs</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credits Sold</CardTitle>
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(financial.credits_sold || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total purchased by users</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Operational Metrics */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" /> Operational Metrics
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm hover:shadow-md transition-shadow border-blue-100 dark:border-blue-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{operational.active_users || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Verified & Active accounts</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credits Used</CardTitle>
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(financial.credits_used || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Consumed across all features</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rendering Jobs</CardTitle>
              <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-md">
                <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{operational.rendering_jobs || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  {operational.rendering_jobs > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${operational.rendering_jobs > 0 ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
                </span>
                Currently processing
              </p>
            </CardContent>
          </Card>

          <Card className={`shadow-sm hover:shadow-md transition-shadow ${operational.failed_jobs > 0 ? 'border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed Jobs</CardTitle>
              <div className={`p-1.5 rounded-md ${operational.failed_jobs > 0 ? 'bg-red-200 dark:bg-red-900' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <AlertCircle className={`h-4 w-4 ${operational.failed_jobs > 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-500'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${operational.failed_jobs > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{operational.failed_jobs || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Requires admin attention</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" /> System Alerts
            </CardTitle>
            <CardDescription>Recent anomalies or failed tasks requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {operational.failed_jobs > 0 ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 p-5 border border-red-200 dark:border-red-900/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-base font-semibold text-red-800 dark:text-red-200">Attention Required</h3>
                    <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                      <p>
                        There are <strong>{operational.failed_jobs}</strong> failed rendering jobs in the queue. 
                      </p>
                    </div>
                  </div>
                </div>
                <Link href="/admin/infrastructure/queue">
                  <Button variant="destructive" size="sm" className="whitespace-nowrap shadow-sm">
                    View Queue
                  </Button>
                </Link>
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                 <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                   <CheckCircle className="h-8 w-8 text-emerald-500" />
                 </div>
                 <p className="text-lg font-medium text-slate-700 dark:text-slate-300">All systems operational</p>
                 <p className="text-sm mt-1 opacity-80">No recent failures detected.</p>
               </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-1 lg:col-span-3 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Shortcuts to common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Link href="/admin/users" className="group flex items-center p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm hover:shadow-md">
              <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">User Management</p>
                <p className="text-xs text-muted-foreground mt-0.5">Manage RBAC, wallets & profiles</p>
              </div>
            </Link>
            <Link href="/admin/providers" className="group flex items-center p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-purple-200 dark:hover:border-purple-800 transition-all shadow-sm hover:shadow-md">
              <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <Cpu className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Manage Providers</p>
                <p className="text-xs text-muted-foreground mt-0.5">{providersCount || 0} active AI providers</p>
              </div>
            </Link>
            <Link href="/admin/billing" className="group flex items-center p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all shadow-sm hover:shadow-md">
              <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Commercial Billing</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pricing models & packages</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}