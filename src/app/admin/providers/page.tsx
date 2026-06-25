import { getProviders } from "./actions"
import { ProvidersTabs } from "./components/providers-tabs"
import { LogOut } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProvidersPage() {
  const providers = await getProviders()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">AI Providers</h1>
          <form action="/api/logout" method="GET">
            <button
              type="submit"
              className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
        <p className="text-muted-foreground text-slate-500">
          Manage integrations with LLMs, Voice Generation, Storage, and Subtitles. API Keys are securely masked.
        </p>
      </div>

      <ProvidersTabs initialData={providers} />
    </div>
  )
}
// test
