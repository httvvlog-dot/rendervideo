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

  let schemaWarning = null

  if (error) {
    console.error("Schema Check Failed (ai_models):", error.message)
    schemaWarning = `Database schema is older than application version or missing columns. Error: ${error.message}`
  }

  // Fetch all providers for the create/edit dropdown
  const { data: providers, error: providersError } = await supabase
    .from("providers")
    .select("id, provider_name, provider_key")
    .order("provider_name")

  if (providersError) {
    console.error("Schema Check Failed (providers):", providersError.message)
  }

  // Fetch provider health
  const { data: healthData, error: healthError } = await supabase
    .from("provider_health_view")
    .select("*")
    
  if (healthError) {
    console.error("Schema Check Failed (provider_health_view):", healthError.message)
    if (!schemaWarning) {
      schemaWarning = `Missing provider_health_view. Health indicators will not be shown.`
    }
  }

  return (
    <>
      {schemaWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700 font-medium">
                Schema Compatibility Warning:
              </p>
              <p className="text-sm text-amber-600 mt-1">
                {schemaWarning}
              </p>
            </div>
          </div>
        </div>
      )}
      <AIModelsClient 
        initialModels={models || []} 
        providers={providers || []} 
        providerHealth={healthData || []}
      />
    </>
  )
}
