import { createClient } from "@/utils/supabase/server"
import { AIModelsClient } from "./components/ai-models-client"

export default async function AIModelsPage() {
  const supabase = await createClient()

  // Fetch all models joined with their providers
  const { data: models, error } = await supabase
    .from("ai_models")
    .select(`
      id,
      display_name,
      api_slug,
      capability,
      provider_family,
      features,
      is_active,
      priority,
      description,
      ai_plan_profiles (
        plan_key
      ),
      providers (
        id,
        provider_name,
        provider_key
      )
    `)
    .order("provider_id")
    .order("display_name")

  if (error) {
    return <div>Error loading models: {error.message}</div>
  }

  // Fetch all providers for the create/edit dropdown
  const { data: providers } = await supabase
    .from("providers")
    .select("id, provider_name, provider_key")
    .order("provider_name")

  // Fetch provider health
  const { data: healthData } = await supabase
    .from("provider_health_view")
    .select("*")

  return (
    <AIModelsClient 
      initialModels={models || []} 
      providers={providers || []} 
      providerHealth={healthData || []}
    />
  )
}
