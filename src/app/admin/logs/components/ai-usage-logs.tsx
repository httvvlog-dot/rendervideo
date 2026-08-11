import Link from "next/link";
import { Search, Filter, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAIUsageLogs } from "../actions";
import { UsageDetailDrawer } from "./usage-detail-drawer";

export async function AIUsageLogs({ searchParams }: { searchParams: any }) {
  const { data: logs, count, error } = await getAIUsageLogs(searchParams);
  
  const q = searchParams.q || "";
  const featureParam = searchParams.feature || "ALL";
  const providerParam = searchParams.provider || "ALL";
  const statusParam = searchParams.status || "ALL";
  const from = searchParams.from || "";
  const to = searchParams.to || "";
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
      case "FAILED":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      case "TIMEOUT":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
      default:
        return "bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  // Helper to persist other query params
  const buildQuery = (overridePage?: number) => {
    const query = new URLSearchParams();
    if (overridePage) query.set("page", overridePage.toString());
    else if (page > 1) query.set("page", page.toString());
    
    // Must add tab=usage to stay on the correct tab
    query.set("tab", "usage");

    if (q) query.set("q", q);
    if (featureParam !== "ALL") query.set("feature", featureParam);
    if (providerParam !== "ALL") query.set("provider", providerParam);
    if (statusParam !== "ALL") query.set("status", statusParam);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    return `?${query.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
        <form className="flex flex-col sm:flex-row w-full items-center gap-3 flex-wrap">
          <input type="hidden" name="tab" value="usage" />
          
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search ID, Error..."
              className="pl-9 bg-white dark:bg-slate-950 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="w-[130px]">
            <select
              name="feature"
              defaultValue={featureParam}
              className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-slate-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ALL">All Features</option>
              <option value="Script">Script</option>
              <option value="Voice">Voice</option>
              <option value="Image">Image</option>
              <option value="Render">Render</option>
            </select>
          </div>

          <div className="w-[130px]">
            <select
              name="provider"
              defaultValue={providerParam}
              className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-slate-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ALL">All Providers</option>
              <option value="OpenAI">OpenAI</option>
              <option value="ElevenLabs">ElevenLabs</option>
              <option value="Runway">Runway</option>
              <option value="HataraWorker">HataraWorker</option>
            </select>
          </div>
          
          <div className="w-[130px]">
            <select
              name="status"
              defaultValue={statusParam}
              className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-slate-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ALL">All Status</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="TIMEOUT">TIMEOUT</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              name="from"
              defaultValue={from}
              className="bg-white dark:bg-slate-950 w-[130px]"
              aria-label="From date"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              name="to"
              defaultValue={to}
              className="bg-white dark:bg-slate-950 w-[130px]"
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
          <p className="font-semibold">Error loading usage logs</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">Time</th>
                  <th scope="col" className="px-6 py-3 font-medium">User ID</th>
                  <th scope="col" className="px-6 py-3 font-medium">Feature</th>
                  <th scope="col" className="px-6 py-3 font-medium">Provider</th>
                  <th scope="col" className="px-6 py-3 font-medium">Model</th>
                  <th scope="col" className="px-6 py-3 font-medium">Cost</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
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
                        {log.user_id ? `${log.user_id.split('-')[0]}...` : '-'}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                        {log.feature}
                      </td>
                      <td className="px-6 py-4">
                        {log.provider}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {log.model}
                      </td>
                      <td className="px-6 py-4 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        {log.api_cost !== null && log.api_cost !== undefined ? `$${Number(log.api_cost).toFixed(6)}` : '-'}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-3">
                        <Badge variant="outline" className={`font-mono shadow-sm text-[10px] ${getStatusColor(log.status)}`}>
                          {log.status || 'UNKNOWN'}
                        </Badge>
                        <UsageDetailDrawer log={log} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                          <ShieldAlert className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">No usage logs found</p>
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
                    <Link href={`/admin/logs${buildQuery(page - 1)}`}>
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
                    let pageNum = page - 2 + i;
                    if (page <= 2) pageNum = i + 1;
                    if (pageNum > 0 && pageNum <= Math.ceil(count / limit)) {
                      return (
                        <Link key={pageNum} href={`/admin/logs${buildQuery(pageNum)}`}>
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
                    <Link href={`/admin/logs${buildQuery(page + 1)}`}>
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
