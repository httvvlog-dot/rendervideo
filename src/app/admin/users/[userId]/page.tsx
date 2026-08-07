import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, User, Wallet, FolderKanban, Activity, History, CreditCard, CheckCircle2, XCircle } from "lucide-react"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/utils/roles"
import { notFound } from "next/navigation"
import { GrantCreditsModal, AdjustCreditsModal } from "./credit-modals"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { InfoPopover } from "@/components/ui/info-popover"
import { ImageTierForm } from "./image-tier-form"

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

  const transactions = allTransactions?.slice(0, 20) || []
  
  const completedTxs = allTransactions?.filter(t => t.status === 'COMPLETED') || []
  const lifetimeUsed = completedTxs.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0)
  const lifetimePurchased = completedTxs.filter(t => t.transaction_type === 'PURCHASE' && t.amount > 0).reduce((acc, t) => acc + t.amount, 0)
  const lifetimeGranted = completedTxs.filter(t => (t.transaction_type === 'GRANT' || t.transaction_type === 'ADMIN_GRANT' || t.transaction_type === 'MANUAL_ADJUSTMENT') && t.amount > 0).reduce((acc, t) => acc + t.amount, 0)

  // Calculate Feature Usage Summary
  const featureUsage = completedTxs.filter(t => t.amount < 0).reduce((acc, t) => {
    const f = t.feature || 'Other'
    if (!acc[f]) acc[f] = { count: 0, credits: 0 }
    acc[f].count += 1
    acc[f].credits += Math.abs(t.amount)
    return acc
  }, {} as Record<string, { count: number, credits: number }>)

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">Back</Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{profile.full_name || profile.email}</h1>
          <span className={`px-2 py-1 text-xs rounded-full ${
            profile.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
          }`}>
            Role: {profile.role}
          </span>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            profile.image_tier === 'VIP' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' :
            profile.image_tier === 'PRO' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' :
            'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            Tier: {profile.image_tier || 'FREE'}
          </span>
          {profile.status === 'suspended' && (
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Suspended</span>
          )}
        </div>
        <div className="flex items-center gap-2">
           <GrantCreditsModal userId={profile.id} />
           <AdjustCreditsModal userId={profile.id} />
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <User className="h-4 w-4 mr-2"/> Overview
            <InfoPopover description="Nơi cung cấp cái nhìn nhanh nhất về tài khoản này: tổng số Credit đang có, tổng Credit đã dùng, số lượng Project đang làm, và trạng thái tài khoản." />
          </TabsTrigger>
          <TabsTrigger value="wallet">
            <Wallet className="h-4 w-4 mr-2"/> Wallet
            <InfoPopover description="Hiển thị chi tiết cấu trúc tiền trong ví (các Bucket). Bạn sẽ thấy danh sách các khoản tín dụng đang còn hiệu lực và hạn sử dụng của chúng." />
          </TabsTrigger>

          <TabsTrigger value="projects">
            <FolderKanban className="h-4 w-4 mr-2"/> Projects
            <InfoPopover description="Liệt kê các video/script mà user này đã và đang làm. Giúp theo dõi trạng thái tiến độ các project (Draft, Rendering, Completed, Failed)." />
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <History className="h-4 w-4 mr-2"/> Transactions
            <InfoPopover description="Sao kê (Bank Statement) của tài khoản. Ghi nhận mọi biến động số dư: cộng tiền do Admin cấp hay trừ tiền do render video." />
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Shield className="h-4 w-4 mr-2"/> Audit Logs
            <InfoPopover description="Nhật ký kiểm toán giám sát Admin. Ghi lại hành động của Admin đối với User này (ai cấp credit, cấp bao nhiêu, lúc mấy giờ...)." />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-medium text-sm font-mono">{profile.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email} {profile.is_verified ? <CheckCircle2 className="inline h-3 w-3 text-emerald-500" /> : <XCircle className="inline h-3 w-3 text-red-500" />}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{profile.company || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">{new Date(profile.created_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Image Generation Tier</CardTitle>
              <CardDescription>Select the image generation capability tier for this user.</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageTierForm 
                userId={userId} 
                currentTier={profile.image_tier || 'FREE'} 
                availableTiers={availableTiers} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="bg-indigo-50 dark:bg-indigo-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Available Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {Number(wallet?.balance_credits || 0).toLocaleString()}
                </div>
                <p className="text-xs mt-1 text-muted-foreground">Total usable credits</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lifetime Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(lifetimeUsed || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lifetime Purchased</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(lifetimePurchased || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lifetime Granted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(lifetimeGranted || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reserved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(wallet?.reserved_credits || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Currently locked</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage Summary</CardTitle>
                <CardDescription>Aggregate of completed usage transactions by feature</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b text-left">
                    <tr>
                      <th className="px-4 py-2">Feature</th>
                      <th className="px-4 py-2">Jobs/Generations</th>
                      <th className="px-4 py-2">Credits Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(featureUsage).length > 0 ? Object.entries(featureUsage).map(([feature, stats]: [string, any]) => (
                      <tr key={feature}>
                        <td className="px-4 py-2 font-medium">{feature}</td>
                        <td className="px-4 py-2">{Number(stats.count).toLocaleString()}</td>
                        <td className="px-4 py-2">{Number(stats.credits).toLocaleString()}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">No feature usage recorded</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Credit Buckets</CardTitle>
                <CardDescription>
                  Legacy credit allocation system 
                  <span className="block mt-1 text-xs text-amber-600 dark:text-amber-500">
                    Note: Credit Buckets are not the primary balance source for Billing V4.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm opacity-80">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b text-left">
                    <tr>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Balance</th>
                      <th className="px-4 py-2">Expires At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {buckets && buckets.length > 0 ? buckets.map((b: any) => (
                      <tr key={b.id}>
                        <td className="px-4 py-2 font-medium">{b.bucket_type}</td>
                        <td className="px-4 py-2">{Number(b.balance).toLocaleString()}</td>
                        <td className="px-4 py-2">{b.expires_at ? new Date(b.expires_at).toLocaleDateString() : 'Never'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">No active buckets</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
            </CardHeader>
            <CardContent>
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                   <tr>
                     <th className="px-4 py-2">Title</th>
                     <th className="px-4 py-2">Status</th>
                     <th className="px-4 py-2">Created</th>
                     <th className="px-4 py-2 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {projects && projects.length > 0 ? projects.map((p: any) => (
                     <tr key={p.project_id}>
                       <td className="px-4 py-2 font-medium">{p.title}</td>
                       <td className="px-4 py-2">
                         <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">{p.lifecycle_status}</span>
                       </td>
                       <td className="px-4 py-2 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                       <td className="px-4 py-2 text-right">
                         <Link href={`/projects/${p.project_id}`}><Button variant="link" size="sm">View</Button></Link>
                       </td>
                     </tr>
                   )) : (
                     <tr><td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">No projects</td></tr>
                   )}
                 </tbody>
               </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Transactions</CardTitle>
            </CardHeader>
            <CardContent>
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                   <tr>
                     <th className="px-4 py-2">Date</th>
                     <th className="px-4 py-2">Feature / Type</th>
                     <th className="px-4 py-2 text-right">Amount</th>
                     <th className="px-4 py-2 text-right">Balance After</th>
                     <th className="px-4 py-2">Status</th>
                     <th className="px-4 py-2">Details</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {transactions && transactions.length > 0 ? transactions.map((t: any) => {
                     let statusColor = "text-muted-foreground"
                     if (t.status === 'COMPLETED') statusColor = "text-emerald-500 font-medium"
                     if (t.status === 'FAILED') statusColor = "text-red-500 font-medium"
                     if (t.status === 'PENDING') statusColor = "text-amber-500 font-medium"

                     return (
                       <tr key={t.id}>
                         <td className="px-4 py-2 text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                         <td className="px-4 py-2">
                           <div className="font-medium">{t.feature || t.transaction_type}</div>
                           {t.provider && <div className="text-xs text-muted-foreground">{t.provider}</div>}
                         </td>
                         <td className={`px-4 py-2 text-right font-medium ${t.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {t.amount > 0 ? '+' : ''}{Number(t.amount).toLocaleString()}
                         </td>
                         <td className="px-4 py-2 text-right font-medium">{Number(t.balance_after).toLocaleString()}</td>
                         <td className={`px-4 py-2 text-xs ${statusColor}`}>{t.status}</td>
                         <td className="px-4 py-2 text-xs text-muted-foreground">
                           <div>{t.description}</div>
                           {t.reference_id && <div className="text-[10px] opacity-70">Ref: {t.reference_type}</div>}
                         </td>
                       </tr>
                     )
                   }) : (
                     <tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">No transactions</td></tr>
                   )}
                 </tbody>
               </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Admin Audit Logs</CardTitle>
              <CardDescription>Immutable record of admin actions on this user</CardDescription>
            </CardHeader>
            <CardContent>
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                   <tr>
                     <th className="px-4 py-2">Date</th>
                     <th className="px-4 py-2">Admin</th>
                     <th className="px-4 py-2">Action</th>
                     <th className="px-4 py-2">Reason</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {auditLogs && auditLogs.length > 0 ? auditLogs.map((log: any) => (
                     <tr key={log.id}>
                       <td className="px-4 py-2 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                       <td className="px-4 py-2 font-medium">{log.admin?.email || log.admin_id}</td>
                       <td className="px-4 py-2 text-xs">
                         <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{log.action}</span>
                       </td>
                       <td className="px-4 py-2 text-muted-foreground">{log.reason}</td>
                     </tr>
                   )) : (
                     <tr><td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">No audit logs</td></tr>
                   )}
                 </tbody>
               </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
