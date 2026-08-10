import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Search, MoreVertical, CheckCircle2, XCircle, ShieldAlert, Wallet, Filter } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; role?: string; status?: string }>
}) {
  await requireAdmin()
  const supabase = await createClient()

  const resolvedParams = await searchParams;
  const q = resolvedParams.q || ''
  const page = parseInt(resolvedParams.page || '1', 10)
  const role = resolvedParams.role || null
  const status = resolvedParams.status || null
  const limit = 20
  const offset = (page - 1) * limit

  // Call the new RPC
  const { data: users, error } = await supabase.rpc('get_admin_users_list', {
    p_search_query: q,
    p_role: role,
    p_status: status,
    p_limit: limit,
    p_offset: offset
  })

  if (error) {
    console.error("GET_ADMIN_USERS_LIST ERROR:", error)
  }

  const totalCount = users && users.length > 0 ? users[0].total_count : 0
  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 shadow-sm flex items-center">
          <ShieldAlert className="w-5 h-5 mr-3 text-red-500" />
          <div>
            <strong className="block text-sm">Database Error</strong>
            <span className="text-xs">{error.message}</span>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage {totalCount} platform members, their roles, and wallets.</p>
        </div>
        <Link href="/admin/users/new">
          <Button className="shadow-sm">Add User</Button>
        </Link>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4 bg-slate-50/50 dark:bg-slate-900/50 border-b">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <form className="flex w-full md:max-w-md items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search by email, name..."
                  className="pl-9 bg-white dark:bg-slate-950 focus-visible:ring-indigo-500"
                />
              </div>
              <Button type="submit" variant="secondary" className="shadow-sm">Search</Button>
            </form>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="shadow-sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">User</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Tier</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Wallet</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Projects</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-right font-medium whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users && users.length > 0 ? (
                  users.map((u: any) => (
                    <tr key={u.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <AvatarFallback className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-medium">
                              {u.full_name ? u.full_name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{u.full_name || 'Unnamed User'}</span>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                          </div>
                          {u.role === 'super_admin' || u.role === 'admin' ? (
                             <Badge variant="outline" className="ml-2 text-[10px] uppercase tracking-wider bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                               {u.role}
                             </Badge>
                          ) : null}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <Badge 
                          variant="secondary"
                          className={`font-semibold shadow-sm ${
                            u.image_tier === 'VIP' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 border-0' :
                            u.image_tier === 'PRO' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 border-0' :
                            'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {u.image_tier || 'FREE'}
                        </Badge>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                          <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{Number(u.balance_credits || 0).toLocaleString()}</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{u.total_projects || 0}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">Projects</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {u.status === 'active' ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-xs font-medium border border-emerald-100 dark:border-emerald-900/50">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </div>
                          ) : u.status === 'suspended' ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-xs font-medium border border-amber-100 dark:border-amber-900/50">
                              <ShieldAlert className="h-3 w-3" /> Suspended
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 text-xs font-medium border border-red-100 dark:border-red-900/50">
                              <XCircle className="h-3 w-3" /> {u.status}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <Link href={`/admin/users/${u.user_id}`}>
                          <Button variant="outline" size="sm" className="shadow-sm group-hover:border-indigo-300 dark:group-hover:border-indigo-700 transition-colors">
                            Manage
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                          <Users className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">No users found</p>
                        <p className="text-sm">Try adjusting your search query.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-slate-900 dark:text-slate-100">{totalCount > 0 ? offset + 1 : 0}</span> to <span className="font-medium text-slate-900 dark:text-slate-100">{Math.min(offset + limit, totalCount)}</span> of <span className="font-medium text-slate-900 dark:text-slate-100">{totalCount}</span> users
              </p>
              
              {totalPages > 1 && (
                <div className="flex space-x-2">
                  <Link href={`/admin/users?q=${q}&page=${Math.max(page - 1, 1)}`}>
                    <Button variant="outline" size="sm" disabled={page === 1} className="shadow-sm">
                      Previous
                    </Button>
                  </Link>
                  <Link href={`/admin/users?q=${q}&page=${Math.min(page + 1, totalPages)}`}>
                    <Button variant="outline" size="sm" disabled={page === totalPages} className="shadow-sm">
                      Next
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}