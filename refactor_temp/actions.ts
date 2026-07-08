"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/utils/roles"
import { logAudit } from "@/utils/audit"
import { revalidatePath } from "next/cache"

export async function getProviders() {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .order("provider_type", { ascending: true })

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
  const supabase = createAdminClient()

  // Extract common fields
  const provider_key = formData.provider_key
  const is_active = formData.is_active ?? true

  if (!provider_key) return { error: "provider_key is required" }

  // Fetch existing provider to merge API keys
  let existingConfig: any = {}
  let oldData = null
  
  const { data: existing } = await supabase.from("providers").select("*").eq("provider_key", provider_key).single()
  if (existing) {
    existingConfig = existing.config_json || {}
    oldData = existing
  } else {
    return { error: "Provider not found in system" }
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
    is_active,
    config_json: newConfig,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase.from("providers").update(payload).eq("provider_key", provider_key)
  if (error) return { error: error.message }
  await logAudit({ action: "Update", entityType: "Provider", entityId: provider_key, oldData, newData: payload })

  revalidatePath("/admin/providers")
  return { success: true }
}

export async function toggleProvider(provider_key: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: oldData } = await supabase.from("providers").select("*").eq("provider_key", provider_key).single()
  if (!oldData) return { error: "Provider not found" }
  
  const newState = !oldData.is_active
  
  const { error } = await supabase.from("providers").update({ 
    is_active: newState, 
    updated_at: new Date().toISOString() 
  }).eq("provider_key", provider_key)
  if (error) return { error: error.message }

  await logAudit({ action: "Update", entityType: "Provider", entityId: provider_key, oldData, newData: { is_active: newState } })

  revalidatePath("/admin/providers")
  return { success: true, is_active: newState }
}

export async function testOpenRouterConnection(providerKey: string, apiKeyInput: string | null) {
  await requireAdmin();
  const supabase = createAdminClient();
  
  let actualKey = apiKeyInput;
  if (!actualKey || actualKey === "••••••••••••••••") {
    if (!providerKey) return { success: false, error: "No API Key provided" };
    const { data } = await supabase.from("providers").select("config_json").eq("provider_key", providerKey).single();
    if (!data || !data.config_json?.apiKey) return { success: false, error: "No API Key found in database" };
    actualKey = data.config_json.apiKey;
  }

  try {
    const startTime = Date.now();
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${actualKey}`
      }
    });
    
    const latency = Date.now() - startTime;
    
    if (!res.ok) {
      return { success: false, error: `API returned status ${res.status}`, status: res.status };
    }
    
    const data = await res.json();
    return { 
      success: true, 
      latency, 
      status: res.status, 
      modelCount: data.data?.length || 0,
      models: data.data?.slice(0, 5).map((m: any) => m.id) || []
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function syncElevenLabsVoices(providerKey: string) {
  const supabase = createAdminClient();
  const { data: provider } = await supabase.from('providers').select('*').eq('provider_key', providerKey).single();
  if (!provider || !provider.config_json?.apiKey) return { success: false, error: 'API Key missing' };
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': provider.config_json.apiKey } });
    if (!res.ok) { await supabase.from('providers').update({ health_status: 'warning' }).eq('provider_key', providerKey); return { success: false, error: 'API Error' }; }
    const data = await res.json();
    const voices = data.voices || [];
    if (voices.length === 0) return { success: true, count: 0, message: 'No voices' };
    const catalogEntries = voices.map((v: any) => ({ provider: 'ElevenLabs', voice_id: v.voice_id, name: v.name, preview_url: v.preview_url }));
    await supabase.from('voice_catalog').upsert(catalogEntries, { onConflict: 'voice_id' });
    await supabase.from('providers').update({ health_status: 'healthy' }).eq('provider_key', providerKey);
    return { success: true, count: voices.length, message: 'Synced ' + voices.length + ' voices.' };
  } catch (err: any) {
    await supabase.from('providers').update({ health_status: 'offline' }).eq('provider_key', providerKey);
    return { success: false, error: err.message };
  }
}
