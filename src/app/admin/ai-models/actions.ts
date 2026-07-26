"use server"

import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/utils/roles"
import { revalidatePath } from "next/cache"
import { CredentialSelector } from "@/utils/provider-runtime/credential-selector"


export async function saveAIModel(id: string | null, payload: any) {
  await requireAdmin()
  const supabase = createAdminClient()

  try {
    // 1. Validation
    if (!payload.provider_id || !payload.api_slug || !payload.capability) {
      throw new Error("Missing required fields")
    }

    // Trim, lowercase, and regex check for api_slug
    let slug = payload.api_slug.trim().toLowerCase()
    if (!/^[a-z0-9\-\_\/]+$/.test(slug)) {
      throw new Error("API Slug contains invalid characters. Only a-z, 0-9, -, _, / are allowed.")
    }
    payload.api_slug = slug

    if (id) {
      // 2. Lock check for editing
      const { count: usageCount, error: countErr } = await supabase
        .from("ai_plan_profiles")
        .select("id", { count: "exact", head: true })
        .eq("ai_model_id", id)
      
      if (countErr) throw countErr

      if (usageCount !== null && usageCount > 0) {
        // Fetch existing model to see if provider or slug changed
        const { data: existingModel } = await supabase.from("ai_models").select("provider_id, api_slug").eq("id", id).single()
        
        if (existingModel) {
          if (existingModel.provider_id !== payload.provider_id || existingModel.api_slug !== payload.api_slug) {
            throw new Error(`Cannot change Provider or API Slug because this model is currently used by ${usageCount} plans.`)
          }
        }
      }

      const { error } = await supabase
        .from("ai_models")
        .update(payload)
        .eq("id", id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from("ai_models")
        .insert(payload)

      if (error) throw error
    }

    revalidatePath("/admin/ai-models")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function testAIModel(modelId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  try {
    const { data: model, error } = await supabase
      .from("ai_models")
      .select("*, providers(*)")
      .eq("id", modelId)
      .single()

    if (error || !model) throw new Error("Model not found")

    // For now, we only check if the provider is healthy and has an active credential
    let hasActiveCredential = false

    try {
      // getActiveCredentials expects the provider key (e.g. 'falai')
      const providerKey = model.providers?.provider_key
      if (!providerKey) throw new Error("Provider key missing")
      
      const selector = new CredentialSelector(providerKey)
      const creds = await selector.getActiveCredentials()
      if (creds && creds.length > 0) hasActiveCredential = true
    } catch (e) {
      hasActiveCredential = false
    }

    if (!hasActiveCredential) {
      return { 
        success: false, 
        message: "No active credentials found for this Provider",
        providerSupport: false
      }
    }

    // Since we don't generate real images, and most providers don't have a specific model validation endpoint 
    // that we've mapped yet, we return a successful diagnostic message.
    return {
      success: true,
      message: `Provider is Active. Model slug '${model.api_slug}' format is valid.`,
      providerSupport: false // indicates no remote validation is supported
    }

  } catch (err: any) {
    return { success: false, message: err.message, providerSupport: false }
  }
}
