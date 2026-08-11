"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export function UsageDetailDrawer({ log }: { log: any }) {
  const [open, setOpen] = useState(false);

  // Helper to determine status badge color
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

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium underline"
      >
        View details
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>AI Usage Information</SheetTitle>
            <SheetDescription>
              Detailed record of AI usage and API costs.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Status</h4>
              <Badge variant="outline" className={`font-mono shadow-sm ${getStatusColor(log.status)}`}>
                {log.status || 'UNKNOWN'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">User ID</span>
                <span className="font-mono break-all">{log.user_id || '-'}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Project ID</span>
                <span className="font-mono break-all">{log.project_id || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Section ID</span>
                <span className="font-mono break-all">{log.section_id || '-'}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Created At</span>
                <span>{new Date(log.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Feature</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{log.feature || '-'}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Provider</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{log.provider || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Model</span>
                <span className="font-mono break-all">{log.model || '-'}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Cost</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  {log.api_cost !== null && log.api_cost !== undefined ? `${Number(log.api_cost).toFixed(6)} ${log.currency || 'USD'}` : '-'}
                </span>
              </div>
            </div>

            {log.error_message && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Error Message</h4>
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-3 rounded-md border border-red-200 dark:border-red-900 break-words">
                  {log.error_message}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Usage Metadata</h4>
              <pre className="text-xs font-mono p-3 bg-slate-900 text-slate-50 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
                {log.usage_metadata ? JSON.stringify(log.usage_metadata, null, 2) : 'null'}
              </pre>
            </div>
            
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
