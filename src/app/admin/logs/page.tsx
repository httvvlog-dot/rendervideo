import Link from "next/link";
import { requireAdmin } from "@/utils/roles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AdminAuditLogs } from "./components/admin-audit-logs";
import { AIUsageLogs } from "./components/ai-usage-logs";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  await requireAdmin();
  
  const resolvedParams = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground mt-1">Monitor administrative actions and AI usage across the platform.</p>
        </div>
      </div>

      <Tabs defaultValue={resolvedParams.tab || "audit"} className="w-full">
        <TabsList className="mb-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <TabsTrigger value="audit" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 cursor-pointer">
            Admin Audit Logs
          </TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 cursor-pointer">
            AI Usage Logs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="audit" className="m-0">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <AdminAuditLogs searchParams={resolvedParams} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="usage" className="m-0">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <AIUsageLogs searchParams={resolvedParams} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}