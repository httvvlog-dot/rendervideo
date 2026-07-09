import { ProvidersTabs } from "./components/providers-tabs"

export const dynamic = "force-dynamic"

export default async function ProvidersPage() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">TEST LEVEL 3 - RENDER COMPONENTS (NO DATA)</h1>
      <ProvidersTabs initialData={[]} />
    </div>
  )
}
