"use server"

import { createClient } from "@/utils/supabase/server"
import { requireAdmin } from "@/utils/roles"
import { logAudit } from "@/utils/audit"
import { revalidatePath } from "next/cache"

export async function getProviders() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .order("provider_type", { ascending: true })
    .order("priority", { ascending: false })

  if (error) throw new Error(error.message)

  // Mask API Keys for security before sending to client
  const maskedData = data.map(provider => {
    const safeConfig = { ...provider.config_json } as any
    let hasApiKey = false
    
    // Mask apiKey/secretKey fields if they exist
    if (safeConfig.apiKey) {
      hasApiKey = true
      safeConfig.apiKey = "••••••••••••••••"
    }
    if (safeConfig.secretKey) {
      hasApiKey = true
      safeConfig.secretKey = "••••••••••••••••"
    }

    return {
      ...provider,
      config_json: safeConfig,
      _hasSecret: hasApiKey
    }
  })

  return maskedData
}

export async function saveProvider(formData: any) {
  await requireAdmin()
  const supabase = await createClient()

  // Extract common fields
  const id = formData.id
  const provider_type = formData.provider_type
  const provider_name = formData.provider_name
  const is_active = formData.is_active ?? true
  const is_default = formData.is_default ?? false
  const priority = formData.priority ?? 0

  // Fetch existing provider to merge API keys
  let existingConfig: any = {}
  let oldData = null
  
  if (id) {
    const { data: existing } = await supabase.from("providers").select("*").eq("id", id).single()
    if (existing) {
      existingConfig = existing.config_json || {}
      oldData = existing
    }
  }

  // Construct new config
  const newConfig = { ...formData.config }
  
  // Do not overwrite real keys if masked keys are sent back
  if (newConfig.apiKey === "••••••••••••••••" || newConfig.apiKey === "") {
    newConfig.apiKey = existingConfig.apiKey
  }
  if (newConfig.secretKey === "••••••••••••••••" || newConfig.secretKey === "") {
    newConfig.secretKey = existingConfig.secretKey
  }

  const payload = {
    provider_type,
    provider_name,
    is_active,
    is_default,
    priority,
    config_json: newConfig,
    updated_at: new Date().toISOString()
  }

  let resultId = id
  if (id) {
    const { error } = await supabase.from("providers").update(payload).eq("id", id)
    if (error) return { error: error.message }
    await logAudit({ action: "Update", entityType: "Provider", entityId: id, oldData, newData: payload })
  } else {
    const { data, error } = await supabase.from("providers").insert(payload).select("id").single()
    if (error) return { error: error.message }
    resultId = data.id
    await logAudit({ action: "Create", entityType: "Provider", entityId: resultId, oldData: null, newData: payload })
  }

  revalidatePath("/admin/providers")
  return { success: true, id: resultId }
}

export async function deleteProvider(id: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data: oldData } = await supabase.from("providers").select("*").eq("id", id).single()
  
  const { error } = await supabase.from("providers").delete().eq("id", id)
  if (error) return { error: error.message }

  if (oldData) {
    await logAudit({ action: "Delete", entityType: "Provider", entityId: id, oldData, newData: null })
  }

  revalidatePath("/admin/providers")
  return { success: true }
}
