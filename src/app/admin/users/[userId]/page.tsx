import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, User, Wallet, FolderKanban, Activity, History, CreditCard, CheckCircle2, XCircle } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"
import { notFound } from "next/navigation"
import { GrantCreditsModal, AdjustCreditsModal } from "./credit-modals"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { InfoPopover } from "@/components/ui/info-popover"

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin()
  const supabase = await createClient()
  const { userId } = await params;

  // 1. Fetch Profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (!profile) notFound()

  // 2. Fetch Wallet
  const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single()
  
  // 3. Fetch Buckets (Active)
  const { data: buckets } = await supabase.from('wallet_credit_buckets')
    .select('*')
    .eq('wallet_id', wallet?.id)
    .gt('balance', 0)
    .order('expires_at', { ascending: true })
    
  // 4. Fetch Transactions
  const { data: transactions } = await supabase.from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  // 5. Fetch Projects
  const { data: projects } = await supabase.from('vw_project_lifecycle_status')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  // 6. Fetch Audit Logs
  const { data: auditLogs } = await supabase.from('admin_audit_logs')
    .select('*, admin:admin_id(email)')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

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
            {profile.role}
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
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
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
                <div className="text-2xl font-bold">{Number(wallet?.lifetime_used || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lifetime Purchased</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(wallet?.total_purchased_credits || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reserved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(wallet?.reserved_credits || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Currently locked by jobs</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Active Credit Buckets</CardTitle>
              <CardDescription>Breakdown of where credits come from and when they expire</CardDescription>
            </CardHeader>
            <CardContent>
               <table className="w-full text-sm">
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
                     <th className="px-4 py-2">Type</th>
                     <th className="px-4 py-2 text-right">Amount</th>
                     <th className="px-4 py-2 text-right">Balance After</th>
                     <th className="px-4 py-2">Description</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {transactions && transactions.length > 0 ? transactions.map((t: any) => (
                     <tr key={t.id}>
                       <td className="px-4 py-2 text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                       <td className="px-4 py-2 text-xs">{t.transaction_type}</td>
                       <td className={`px-4 py-2 text-right font-medium ${t.amount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                         {t.amount > 0 ? '+' : ''}{Number(t.amount).toLocaleString()}
                       </td>
                       <td className="px-4 py-2 text-right font-medium">{Number(t.balance_after).toLocaleString()}</td>
                       <td className="px-4 py-2 text-xs text-muted-foreground">{t.description || t.feature}</td>
                     </tr>
                   )) : (
                     <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">No transactions</td></tr>
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
