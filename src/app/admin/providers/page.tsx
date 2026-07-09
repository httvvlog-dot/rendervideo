import { getProviders } from "./actions"

export const dynamic = "force-dynamic"

export default async function ProvidersPage() {
  const providers = await getProviders()
  return (
    <div className="p-10 text-2xl font-bold">
      TEST LEVEL 2 - DATA FETCHING ONLY
    </div>
  )
}
