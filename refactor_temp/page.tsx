import { createAdminClient } from "@/utils/supabase/admin"
import { ProviderWorkspaceClient } from "./components/provider-workspace-client"
import { notFound } from "next/navigation"

export default async function ProviderWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: provider_key } = await params
  const supabase = createAdminClient()

  // Find provider by provider_key instead of UUID
  const { data: provider, error } = await supabase
    .from("providers")
    .select("*")
    .eq("provider_key", provider_key)
    .single()

  if (error || !provider) {
    notFound()
  }

  // Mask sensitive credentials
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

  const safeProvider = {
    ...provider,
    config_json: safeConfig,
    _hasSecret: hasApiKey
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <ProviderWorkspaceClient provider={safeProvider} />
    </div>
  )
}
