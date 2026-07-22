import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Search, MoreVertical, CheckCircle2, XCircle, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; role?: string; status?: string }
}) {
  await requireAdmin()
  const supabase = await createClient()

  const q = searchParams.q || ''
  const page = parseInt(searchParams.page || '1', 10)
  const role = searchParams.role || null
  const status = searchParams.status || null
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

  const totalCount = users && users.length > 0 ? users[0].total_count : 0
  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Platform Users</CardTitle>
              <CardDescription>Manage your tenants and members ({totalCount} total)</CardDescription>
            </div>
            <form className="flex w-full max-w-sm items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search email, name, phone..."
                  className="pl-8"
                />
              </div>
              <Button type="submit" variant="secondary">Filter</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Wallet Balance</th>
                  <th className="px-4 py-3 font-medium">Lifetime Spent</th>
                  <th className="px-4 py-3 font-medium">Projects</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users && users.length > 0 ? (
                  users.map((u: any) => (
                    <tr key={u.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.full_name || 'No Name'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {u.status === 'active' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : u.status === 'suspended' ? (
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          <span className="capitalize">{u.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400">
                        {Number(u.balance_credits).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {Number(u.lifetime_used).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.total_projects}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/users/${u.user_id}`}>
                          <Button variant="outline" size="sm">Manage</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No users found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1} to {Math.min(offset + limit, totalCount)} of {totalCount} users
              </p>
              <div className="flex space-x-2">
                <Link href={`/admin/users?q=${q}&page=${Math.max(page - 1, 1)}`}>
                  <Button variant="outline" size="sm" disabled={page === 1}>Previous</Button>
                </Link>
                <Link href={`/admin/users?q=${q}&page=${Math.min(page + 1, totalPages)}`}>
                  <Button variant="outline" size="sm" disabled={page === totalPages}>Next</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}