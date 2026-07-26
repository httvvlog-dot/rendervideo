import { createClient } from "@/utils/supabase/server"
import { AdminHeader } from "@/components/admin-header"
import { AIPlansClient } from "./components/ai-plans-client"

export default async function AIPlansPage() {
  const supabase = await createClient()

  // Fetch all profiles with joined data
  const { data: profiles, error } = await supabase
    .from("ai_plan_profiles")
    .select("*, providers(provider_name, provider_key), ai_models(id, display_name, api_slug)")
    .order("plan_key")

  // Fetch all providers
  const { data: providers } = await supabase
    .from("providers")
    .select("id, provider_name, provider_key")
    .order("provider_name")

  // Fetch all models
  const { data: models } = await supabase
    .from("ai_models")
    .select("id, provider_id, display_name, api_slug, capability, is_active")
    .order("display_name")

  if (error) {
    return <div className="p-8 text-red-500">Error loading AI Plan Profiles: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="AI Plans"
        description="Configure Business Rules for AI models per User Plan and Capability"
      />
      
      <AIPlansClient 
        initialProfiles={profiles || []} 
        providers={providers || []}
        models={models || []}
      />
    </div>
  )
}
