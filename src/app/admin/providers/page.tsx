import { getProviders } from "./actions"
import { ProvidersTabs } from "./components/providers-tabs"
import { LogOut } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProvidersPage() {
  const providers = await getProviders()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">TEST LEVEL 4 - FULL INTEGRATION</h1>
      </div>
      <ProvidersTabs initialData={providers} />
    </div>
  )
}
