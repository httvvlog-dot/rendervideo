import { createAdminClient } from "@/utils/supabase/admin"
import { notFound } from "next/navigation"
import { ProviderWorkspaceClient } from "./components/provider-workspace-client"

export const dynamic = "force-dynamic"

export default async function ProviderWorkspacePage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  
  const { data: provider, error } = await supabase
    .from("providers")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !provider) {
    notFound()
  }

  // Mask secret keys before passing to client
  const safeConfig = { ...provider.config_json } as any
  let hasApiKey = false
  
  if (safeConfig.apiKey) {
    hasApiKey = true
    safeConfig.apiKey = "••••••••••••••••"
  }
  if (safeConfig.secretKey) {
    hasApiKey = true
    safeConfig.secretKey = "••••••••••••••••"
  }

  const maskedProvider = {
    ...provider,
    config_json: safeConfig,
    _hasSecret: hasApiKey
  }

  return (
    <div className="space-y-6">
      <ProviderWorkspaceClient provider={maskedProvider} />
    </div>
  )
}
