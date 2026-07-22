import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Video, DollarSign, Activity, Server, FileCode2, Clock, CheckCircle, TrendingUp, CreditCard, AlertTriangle, AlertCircle } from "lucide-react"
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
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-50">Total Revenue (VND)</CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(financial.revenue_total_vnd || 0).toLocaleString()} ₫</div>
            <p className="text-xs text-indigo-200 mt-1">From successful orders</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Provider Costs (USD)</CardTitle>
            <Server className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(financial.provider_cost_usd || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">API usage expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit (Est. USD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">${Number(financial.gross_profit_estimate_usd || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Revenue - API Costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operational.active_users || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Verified & Active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Sold</CardTitle>
            <CreditCard className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(financial.credits_sold || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(financial.credits_used || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendering Jobs</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operational.rendering_jobs || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operational.failed_jobs || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires admin attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Recent anomalies or failed tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {operational.failed_jobs > 0 ? (
              <div className="rounded-md bg-red-50 dark:bg-red-950/50 p-4 border border-red-200 dark:border-red-900">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Attention Required</h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>
                        There are {operational.failed_jobs} failed rendering jobs in the queue. Please check the Job Queue Logs or User Projects to retry them.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                 <CheckCircle className="h-10 w-10 text-emerald-500 mb-2 opacity-50" />
                 <p>All systems operational. No recent failures.</p>
               </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/admin/users" className="flex items-center p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <Users className="h-5 w-5 mr-3 text-indigo-500" />
              <div>
                <p className="font-medium">User Management</p>
                <p className="text-xs text-muted-foreground">Manage RBAC & Wallets</p>
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
              <CreditCard className="h-5 w-5 mr-3 text-emerald-500" />
              <div>
                <p className="font-medium">Commercial Billing</p>
                <p className="text-xs text-muted-foreground">Pricing & Packages</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}