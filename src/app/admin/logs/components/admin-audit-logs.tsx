import Link from "next/link";
import { Search, Filter, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAdminAuditLogs } from "../actions";
import { LogDetailDrawer } from "./log-detail-drawer";

export async function AdminAuditLogs({ searchParams }: { searchParams: any }) {
  const { data: logs, count, error } = await getAdminAuditLogs(searchParams);
  const q = searchParams.q || "";
  const actionParam = searchParams.action || "ALL";
  const from = searchParams.from || "";
  const to = searchParams.to || "";
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  // Format changes for the table column
  const formatChanges = (log: any) => {
    if (log.action === "UPDATE_IMAGE_TIER") {
      return "Tier updated (View details)";
    }
    if (log.action === "GRANT_CREDIT" || log.action === "ADJUST_CREDIT") {
      const amount = log.new_value?.amount;
      if (amount !== undefined) {
        return amount > 0 ? `+${amount} Credits` : `${amount} Credits`;
      }
    }
    if (log.action === "CHANGE_STATUS") {
      return log.new_value?.status ? `Status -> ${log.new_value.status}` : "Status changed";
    }
    return "View details";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
        <form className="flex flex-col sm:flex-row w-full items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by ID, Reason..."
              className="pl-9 bg-white dark:bg-slate-950 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="flex-1 w-full sm:max-w-[200px]">
            <select
              name="action"
              defaultValue={actionParam}
              className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-slate-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ALL">All Actions</option>
              <option value="GRANT_CREDIT">GRANT_CREDIT</option>
              <option value="ADJUST_CREDIT">ADJUST_CREDIT</option>
              <option value="CHANGE_STATUS">CHANGE_STATUS</option>
              <option value="UPDATE_IMAGE_TIER">UPDATE_IMAGE_TIER</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              name="from"
              defaultValue={from}
              className="bg-white dark:bg-slate-950 max-w-[150px]"
              aria-label="From date"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              name="to"
              defaultValue={to}
              className="bg-white dark:bg-slate-950 max-w-[150px]"
              aria-label="To date"
            />
          </div>

          <Button type="submit" variant="secondary" className="shadow-sm ml-auto">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </form>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
          <p className="font-semibold">Error loading logs</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">Time</th>
                  <th scope="col" className="px-6 py-3 font-medium">Admin ID</th>
                  <th scope="col" className="px-6 py-3 font-medium">Target User ID</th>
                  <th scope="col" className="px-6 py-3 font-medium">Action</th>
                  <th scope="col" className="px-6 py-3 font-medium">Changes</th>
                  <th scope="col" className="px-6 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                {logs.length > 0 ? (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {log.admin_id?.split('-')[0]}...
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {log.target_user_id?.split('-')[0]}...
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-mono bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-sm text-[10px]">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                        <LogDetailDrawer log={log} />
                        <span className="ml-2 text-xs text-muted-foreground hidden lg:inline">
                          ({formatChanges(log)})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm max-w-[200px] truncate" title={log.reason || ""}>
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                          <ShieldAlert className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">No logs found</p>
                        <p className="text-sm text-slate-500">Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {count > 0 && (
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50 dark:bg-slate-900/50 mt-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium text-slate-900 dark:text-slate-100">{offset + 1}</span> to <span className="font-medium text-slate-900 dark:text-slate-100">{Math.min(offset + limit, count)}</span> of <span className="font-medium text-slate-900 dark:text-slate-100">{count}</span> logs
                </p>
                
                <div className="flex items-center gap-1">
                  {page > 1 ? (
                    <Link href={`/admin/logs?page=${page - 1}&q=${encodeURIComponent(q)}&action=${encodeURIComponent(actionParam)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}>
                      <Button variant="outline" size="sm" className="shadow-sm">
                        Previous
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled className="shadow-sm">
                      Previous
                    </Button>
                  )}
                  
                  {/* Simple page numbers */}
                  {Array.from({ length: Math.min(5, Math.ceil(count / limit)) }).map((_, i) => {
                    // Show pages around current page
                    let pageNum = page - 2 + i;
                    if (page <= 2) pageNum = i + 1;
                    if (pageNum > 0 && pageNum <= Math.ceil(count / limit)) {
                      return (
                        <Link key={pageNum} href={`/admin/logs?page=${pageNum}&q=${encodeURIComponent(q)}&action=${encodeURIComponent(actionParam)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}>
                          <Button
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            className="shadow-sm w-9"
                          >
                            {pageNum}
                          </Button>
                        </Link>
                      );
                    }
                    return null;
                  })}

                  {page < Math.ceil(count / limit) ? (
                    <Link href={`/admin/logs?page=${page + 1}&q=${encodeURIComponent(q)}&action=${encodeURIComponent(actionParam)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}>
                      <Button variant="outline" size="sm" className="shadow-sm">
                        Next
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled className="shadow-sm">
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
