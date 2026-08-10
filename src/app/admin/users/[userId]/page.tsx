import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, User, Wallet, FolderKanban, Activity, History, CreditCard, CheckCircle2, XCircle, ArrowRightLeft, TrendingDown, TrendingUp } from "lucide-react"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/utils/roles"
import { notFound } from "next/navigation"
import { GrantCreditsModal, AdjustCreditsModal } from "./credit-modals"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { InfoPopover } from "@/components/ui/info-popover"
import { ImageTierForm } from "./image-tier-form"
import { Badge } from "@/components/ui/badge"

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin()
  const supabaseAdmin = createAdminClient()
  const { userId } = await params;

  // 1. Fetch Profile
  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single()
  if (!profile) notFound()

  // 2. Fetch Wallet
  const { data: wallet } = await supabaseAdmin.from('wallets').select('*').eq('user_id', userId).single()
  
  // 3. Fetch Buckets (Active)
  const { data: buckets } = await supabaseAdmin.from('wallet_credit_buckets')
    .select('*')
    .eq('wallet_id', wallet?.id)
    .gt('balance', 0)
    .order('expires_at', { ascending: true })
    
  // 4. Fetch All Completed Transactions for Aggregation & Latest for Display
  const { data: allTransactions } = await supabaseAdmin.from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const transactions = allTransactions?.slice(0, 30) || []
  
  const completedTxs = allTransactions?.filter(t => t.status === 'COMPLETED') || []
  const lifetimeUsed = completedTxs.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0)
  const lifetimePurchased = completedTxs.filter(t => t.transaction_type === 'PURCHASE' && t.amount > 0).reduce((acc, t) => acc + t.amount, 0)
  const lifetimeGranted = completedTxs.filter(t => (t.transaction_type === 'GRANT' || t.transaction_type === 'ADMIN_GRANT' || t.transaction_type === 'MANUAL_ADJUSTMENT') && t.amount > 0).reduce((acc, t) => acc + t.amount, 0)

  // Calculate Feature Usage Summary EXACTLY based on the backend 'feature' column. No guessing allowed.
  const featureUsage = completedTxs.filter(t => t.amount < 0 && t.feature).reduce((acc, t) => {
    const f = t.feature
    if (!acc[f]) acc[f] = { count: 0, credits: 0 }
    acc[f].count += 1
    acc[f].credits += Math.abs(t.amount)
    return acc
  }, {} as Record<string, { count: number, credits: number }>)
  
  const hasFeatureBreakdown = Object.keys(featureUsage).length > 0;

  // 5. Fetch Projects
  const { data: projects } = await supabaseAdmin.from('vw_project_lifecycle_status')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  // 6. Fetch Audit Logs
  const { data: auditLogs } = await supabaseAdmin.from('admin_audit_logs')
    .select('*, admin:admin_id(email)')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  // 7. Fetch Available Image Tiers
  const { data: imageTiersData } = await supabaseAdmin.from('ai_plan_profiles')
    .select('plan_key')
    .eq('capability', 'IMAGE_GENERATION')
    .eq('is_active', true)
  
  const availableTiers = Array.from(new Set(imageTiersData?.map((t: any) => t.plan_key) || []))

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/users">
              <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground">
                &larr; Back
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {profile.full_name || profile.email}
            </h1>
            
            <Badge 
              variant="secondary"
              className={`text-xs px-2.5 py-1 uppercase tracking-wider font-bold shadow-sm ${
                profile.image_tier === 'VIP' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0' :
                profile.image_tier === 'PRO' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0' :
                'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              {profile.image_tier || 'FREE'}
            </Badge>

            {profile.role === 'admin' || profile.role === 'super_admin' ? (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                {profile.role}
              </Badge>
            ) : null}

            {profile.status === 'suspended' && (
              <Badge variant="destructive" className="text-xs px-2.5 py-1">
                Suspended
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {profile.email} 
            {profile.is_verified ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
          </p>
        </div>
        
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
           <GrantCreditsModal userId={profile.id} />
           <AdjustCreditsModal userId={profile.id} />
        </div>
      </div>

      <Tabs defaultValue="wallet" className="w-full">
        <TabsList className="mb-4 bg-slate-100 dark:bg-slate-900/80 p-1">
          <TabsTrigger value="wallet" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
            <Wallet className="h-4 w-4 mr-2"/> Wallet & Usage
            <InfoPopover description="Hiển thị chi tiết cấu trúc tiền trong ví (Unified Balance). Các số liệu được tổng hợp trực tiếp từ lịch sử giao dịch gốc của hệ thống." />
          </TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
            <User className="h-4 w-4 mr-2"/> Profile Settings
          </TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
            <FolderKanban className="h-4 w-4 mr-2"/> Projects
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
            <History className="h-4 w-4 mr-2"/> Transactions
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4 mr-2"/> Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallet" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md border-0 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-indigo-100">Unified Wallet Balance</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-end">
                <div>
                  <div className="text-4xl font-bold tracking-tight">
                    {Number(wallet?.balance_credits || 0).toLocaleString()}
                  </div>
                  <p className="text-sm mt-1 text-indigo-200">Usable Credits</p>
                </div>
                <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Credit Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{Number(lifetimeUsed || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                   <TrendingDown className="h-3 w-3 text-red-500" /> Lifetime consumption
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchased</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Number(lifetimePurchased || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                   <TrendingUp className="h-3 w-3 text-emerald-500" /> Lifetime top-up
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle>Usage Breakdown</CardTitle>
                <CardDescription>Aggregate of completed transactions grouped by explicit backend feature type</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!hasFeatureBreakdown ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                     <Activity className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                     <p className="font-medium text-slate-600 dark:text-slate-400">Usage breakdown unavailable</p>
                     <p className="text-sm text-muted-foreground mt-1 max-w-xs">No explicit feature types found in transaction history. See Total Credit Used for aggregate consumption.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b text-left">
                      <tr>
                        <th className="px-6 py-3 font-medium text-slate-500">Feature</th>
                        <th className="px-6 py-3 font-medium text-slate-500 text-right">Transactions</th>
                        <th className="px-6 py-3 font-medium text-slate-500 text-right">Credits Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.entries(featureUsage).map(([feature, stats]: [string, any]) => (
                        <tr key={feature} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="px-6 py-3 font-medium capitalize text-slate-900 dark:text-slate-100">{feature.replace(/_/g, ' ')}</td>
                          <td className="px-6 py-3 text-right">{Number(stats.count).toLocaleString()}</td>
                          <td className="px-6 py-3 text-right font-medium text-red-500">-{Number(stats.credits).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-amber-200 dark:border-amber-900/50">
              <CardHeader className="border-b bg-amber-50/30 dark:bg-amber-950/20">
                <CardTitle className="text-amber-900 dark:text-amber-500">Legacy Credit Buckets</CardTitle>
                <CardDescription className="text-amber-700/70 dark:text-amber-600/70">
                  Note: Credit Buckets are not the primary balance source for Billing V4.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50/50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 text-left">
                    <tr>
                      <th className="px-6 py-3 font-medium text-amber-800/70 dark:text-amber-600">Type</th>
                      <th className="px-6 py-3 font-medium text-amber-800/70 dark:text-amber-600 text-right">Balance</th>
                      <th className="px-6 py-3 font-medium text-amber-800/70 dark:text-amber-600 text-right">Expires At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30 bg-amber-50/10 dark:bg-amber-950/10">
                    {buckets && buckets.length > 0 ? buckets.map((b: any) => (
                      <tr key={b.id}>
                        <td className="px-6 py-3 font-medium text-amber-900 dark:text-amber-400">{b.bucket_type}</td>
                        <td className="px-6 py-3 text-right font-bold text-amber-700 dark:text-amber-500">{Number(b.balance).toLocaleString()}</td>
                        <td className="px-6 py-3 text-right text-amber-600 dark:text-amber-600/80">{b.expires_at ? new Date(b.expires_at).toLocaleDateString() : 'Never'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-6 py-8 text-center text-amber-700/50 dark:text-amber-600/50 font-medium">No active buckets</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">User ID</p>
                <p className="font-medium text-sm font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded-md break-all">{profile.id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="font-medium flex items-center gap-2">
                  {profile.email} 
                  {profile.is_verified ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Verified</Badge> : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Unverified</Badge>}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Company</p>
                <p className="font-medium">{profile.company || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Joined Date</p>
                <p className="font-medium">{new Date(profile.created_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-indigo-100 dark:border-indigo-900/50">
            <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/50">
              <CardTitle className="text-indigo-900 dark:text-indigo-400">Subscription Tier Setting</CardTitle>
              <CardDescription className="text-indigo-700/70 dark:text-indigo-400/70">Modify the active subscription tier for this user.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-w-md">
                <ImageTierForm 
                  userId={userId} 
                  currentTier={profile.image_tier || 'FREE'} 
                  availableTiers={availableTiers} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
              <CardTitle>Recent Projects</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 border-b">
                     <tr>
                       <th className="px-6 py-3 font-medium">Title</th>
                       <th className="px-6 py-3 font-medium">Status</th>
                       <th className="px-6 py-3 font-medium">Created</th>
                       <th className="px-6 py-3 text-right font-medium">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {projects && projects.length > 0 ? projects.map((p: any) => (
                       <tr key={p.project_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                         <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{p.title}</td>
                         <td className="px-6 py-4">
                           <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 capitalize shadow-sm">
                             {p.lifecycle_status}
                           </Badge>
                         </td>
                         <td className="px-6 py-4 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                         <td className="px-6 py-4 text-right">
                           <Link href={`/projects/${p.project_id}`}>
                             <Button variant="outline" size="sm" className="shadow-sm">View Editor</Button>
                           </Link>
                         </td>
                       </tr>
                     )) : (
                       <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No projects created yet.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
              <CardTitle>Wallet Transactions</CardTitle>
              <CardDescription>Chronological ledger of balance changes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 border-b">
                     <tr>
                       <th className="px-6 py-3 font-medium">Date</th>
                       <th className="px-6 py-3 font-medium">Feature / Type</th>
                       <th className="px-6 py-3 text-right font-medium">Amount</th>
                       <th className="px-6 py-3 text-right font-medium">Balance After</th>
                       <th className="px-6 py-3 font-medium">Status</th>
                       <th className="px-6 py-3 font-medium">Details</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {transactions && transactions.length > 0 ? transactions.map((t: any) => {
                       let statusBadge = <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200">{t.status}</Badge>;
                       if (t.status === 'COMPLETED') statusBadge = <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1"/> Completed</Badge>;
                       if (t.status === 'FAILED') statusBadge = <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50 shadow-sm"><XCircle className="w-3 h-3 mr-1"/> Failed</Badge>;
                       if (t.status === 'PENDING') statusBadge = <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 shadow-sm"><ArrowRightLeft className="w-3 h-3 mr-1 animate-pulse"/> Pending</Badge>;

                       return (
                         <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                           <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                           <td className="px-6 py-4">
                             <div className="font-medium text-slate-900 dark:text-slate-100 capitalize">{t.feature?.replace(/_/g, ' ') || t.transaction_type}</div>
                             {t.provider && <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{t.provider}</div>}
                           </td>
                           <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${t.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                             {t.amount > 0 ? '+' : ''}{Number(t.amount).toLocaleString()}
                           </td>
                           <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                             {Number(t.balance_after).toLocaleString()}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">{statusBadge}</td>
                           <td className="px-6 py-4 text-xs text-muted-foreground min-w-[200px]">
                             <div className="line-clamp-2">{t.description}</div>
                             {t.reference_id && <div className="text-[10px] opacity-70 mt-1 font-mono">Ref: {t.reference_type}</div>}
                           </td>
                         </tr>
                       )
                     }) : (
                       <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No wallet transactions found.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
              <CardTitle>Admin Audit Logs</CardTitle>
              <CardDescription>Immutable record of administrative actions performed on this account</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 border-b">
                     <tr>
                       <th className="px-6 py-3 font-medium">Timestamp</th>
                       <th className="px-6 py-3 font-medium">Admin / Actor</th>
                       <th className="px-6 py-3 font-medium">Action Event</th>
                       <th className="px-6 py-3 font-medium">Reason / Details</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {auditLogs && auditLogs.length > 0 ? auditLogs.map((log: any) => (
                       <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                         <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                         <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{log.admin?.email || log.admin_id}</td>
                         <td className="px-6 py-4 text-xs">
                           <Badge variant="outline" className="font-mono bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-sm">
                             {log.action}
                           </Badge>
                         </td>
                         <td className="px-6 py-4 text-muted-foreground text-sm">{log.reason || '-'}</td>
                       </tr>
                     )) : (
                       <tr><td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">No audit logs recorded for this user.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
