"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export function LogDetailDrawer({ log }: { log: any }) {
  const [open, setOpen] = useState(false);

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
            <SheetTitle>Audit Information</SheetTitle>
            <SheetDescription>
              Detailed record of the administrative action.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Action</h4>
              <Badge variant="outline" className="font-mono bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-sm">
                {log.action}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Admin ID</span>
                <span className="font-mono break-all">{log.admin_id}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Target User ID</span>
                <span className="font-mono break-all">{log.target_user_id}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Created At</span>
                <span>{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">Request ID</span>
                <span className="font-mono break-all">{log.request_id || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">IP Address</span>
                <span>{log.ip_address || '-'}</span>
              </div>
              <div>
                <span className="block font-medium text-slate-500 dark:text-slate-400">User Agent</span>
                <span className="break-all">{log.user_agent || '-'}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Reason</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                {log.reason || 'No reason provided.'}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Old Value</h4>
              <pre className="text-xs font-mono p-3 bg-slate-900 text-slate-50 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
                {log.old_value ? JSON.stringify(log.old_value, null, 2) : 'null'}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">New Value</h4>
              <pre className="text-xs font-mono p-3 bg-slate-900 text-slate-50 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
                {log.new_value ? JSON.stringify(log.new_value, null, 2) : (log.details ? JSON.stringify(log.details, null, 2) + "\n// (Note: This action incorrectly logged to 'details')" : 'null')}
              </pre>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
