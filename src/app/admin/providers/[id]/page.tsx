import { createAdminClient } from "@/utils/supabase/admin"
import { ProviderWorkspaceClient } from "./components/provider-workspace-client"
import { notFound } from "next/navigation"

export default async function ProviderWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: provider_key } = await params
  const supabase = createAdminClient()

  // Find provider by provider_key and include credentials
  const { data: provider, error } = await supabase
    .from("providers")
    .select("*, credentials:provider_credentials(*)")
    .eq("provider_key", provider_key)
    .single()

  if (error || !provider) {
    notFound()
  }

  // Fetch cached models for this provider
  const { data: models } = await supabase
    .from("provider_models")
    .select("*")
    .eq("provider", provider_key)
    .order("name", { ascending: true })

  // Sort credentials by priority
  if (provider.credentials) {
    provider.credentials.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0))
  }

  // Mask sensitive credentials
  const safeCredentials = (provider.credentials || []).map((cred: any) => {
    const safeConfig = { ...cred.config_json } as any
    let hasApiKey = false
    
    if (safeConfig.apiKey) {
      hasApiKey = true
      safeConfig.apiKey = "••••••••••••••••"
    }
    if (safeConfig.secretKey) {
      hasApiKey = true
      safeConfig.secretKey = "••••••••••••••••"
    }
    if (safeConfig.secretAccessKey) {
      hasApiKey = true
      safeConfig.secretAccessKey = "••••••••••••••••"
    }

    return {
      ...cred,
      config_json: safeConfig,
      _hasSecret: hasApiKey
    }
  })

  const safeProvider = {
    ...provider,
    credentials: safeCredentials
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <ProviderWorkspaceClient provider={safeProvider} providerModels={models || []} />
    </div>
  )
}
