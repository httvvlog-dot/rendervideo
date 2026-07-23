import { Server, Activity, ListTodo } from "lucide-react"
import Link from "next/link"

export default function InfrastructureLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Infrastructure</h1>
        <p className="text-muted-foreground mt-2">Manage render cluster, queues, and system health.</p>
      </div>
      
      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <Link href="/admin/infrastructure/workers" className="flex whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
            <Server className="h-5 w-5 mr-2" /> Render Workers
          </Link>
          <Link href="/admin/infrastructure/queue" className="flex whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
            <ListTodo className="h-5 w-5 mr-2" /> Render Queue
          </Link>
          <Link href="/admin/infrastructure/metrics" className="flex whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
            <Activity className="h-5 w-5 mr-2" /> Metrics
          </Link>
        </nav>
      </div>

      {children}
    </div>
  )
}
