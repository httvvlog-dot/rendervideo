import { getProviders } from "./actions"
import { ProvidersTabs } from "./components/providers-tabs"

export const dynamic = "force-dynamic"

export default async function ProvidersPage() {
  const providers = await getProviders()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">AI Providers</h1>
        <p className="text-muted-foreground text-slate-500">
          Manage integrations with LLMs, Voice Generation, Storage, and Subtitles. API Keys are securely masked.
        </p>
      </div>

      <ProvidersTabs initialData={providers} />
    </div>
  )
}
