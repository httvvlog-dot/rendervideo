"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { PROVIDER_HEALTH_STATUS } from "@/utils/provider-runtime/types"
import { requireAdmin } from "@/utils/roles"
import { logAudit } from "@/utils/audit"
import { revalidatePath } from "next/cache"
import { ProviderRuntime } from "@/utils/provider-runtime"
import { ElevenLabsAdapter } from "@/utils/provider-runtime/adapters/elevenlabs-adapter"

export async function getProviders() {
  await requireAdmin()
  const supabase = createAdminClient()
  
  // Fetch providers
  const { data: providers, error: provError } = await supabase
    .from("providers")
    .select("*")
    .order("provider_type", { ascending: true })

  if (provError) { console.error("Provider Error:", provError); return []; }

  // Fetch credentials
  let { data: credentials, error: credError } = await supabase
    .from("provider_credentials")
    .select("*")
    .order("priority", { ascending: false })

  if (credError) { console.error("Credential Error:", credError); credentials = []; }

  // Map credentials to providers and mask API keys
  const mappedProviders = (providers || []).map(p => {
    const pCreds = (credentials || [])
      .filter(c => c.provider_id === p.id)
      .map(cred => {
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

        return {
          ...cred,
          config_json: safeConfig,
          _hasSecret: hasApiKey
        }
      })

    return {
      ...p,
      credentials: pCreds
    }
  })

  return mappedProviders
}

export async function saveCredential(formData: any) {
  await requireAdmin()
  const supabase = createAdminClient()

  const id = formData.id
  const provider_id = formData.provider_id
  const credential_name = formData.credential_name
  const is_active = formData.is_active ?? true
  const is_default = formData.is_default ?? false
  const priority = formData.priority ?? 0

  if (!provider_id || !credential_name) return { error: "Missing required fields" }

  // Fetch existing credential to merge API keys
  let existingConfig: any = {}
  let oldData = null
  
  if (id) {
    const { data: existing } = await supabase.from("provider_credentials").select("*").eq("id", id).single()
    if (existing) {
      existingConfig = existing.config_json || {}
      oldData = existing
    }
  }

  // Construct new config
  const newConfig = { ...formData.config }
  
  if (newConfig.apiKey === "••••••••••••••••" || newConfig.apiKey === "") {
    newConfig.apiKey = existingConfig.apiKey
  }
  if (newConfig.secretKey === "••••••••••••••••" || newConfig.secretKey === "") {
    newConfig.secretKey = existingConfig.secretKey
  }
  if (newConfig.secretAccessKey === "••••••••••••••••" || newConfig.secretAccessKey === "") {
    newConfig.secretAccessKey = existingConfig.secretAccessKey
  }

  const payload = {
    provider_id,
    credential_name,
    is_active,
    is_default,
    priority,
    config_json: newConfig,
    updated_at: new Date().toISOString()
  }

  let resultId = id

  if (id) {
    const { error } = await supabase.from("provider_credentials").update(payload).eq("id", id)
    if (error) return { error: error.message }
    await logAudit({ action: "Update", entityType: "ProviderCredential", entityId: id, oldData, newData: payload })
  } else {
    // Check if it's the first credential, make it default automatically
    if (!id && !is_default) {
      const { count } = await supabase.from("provider_credentials").select("*", { count: "exact" }).eq("provider_id", provider_id)
      if (count === 0) payload.is_default = true
    }

    const { data, error } = await supabase.from("provider_credentials").insert(payload).select("id").single()
    if (error) return { error: error.message }
    resultId = data.id
    await logAudit({ action: "Create", entityType: "ProviderCredential", entityId: resultId, oldData: null, newData: payload })
  }

  if (payload.is_default) {
    await setDefaultCredential(resultId, provider_id)
  }

  revalidatePath("/admin/providers", "layout")
  return { success: true, id: resultId }
}

export async function deleteCredential(id: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: oldData } = await supabase.from("provider_credentials").select("*").eq("id", id).single()
  if (!oldData) return { error: "Not found" }

  const { error } = await supabase.from("provider_credentials").delete().eq("id", id)
  await logAudit({ action: "Delete", entityType: "ProviderCredential", entityId: id, oldData, newData: null })

  revalidatePath("/admin/providers", "layout")
  return { success: true }
}

export async function toggleCredential(id: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: oldData } = await supabase.from("provider_credentials").select("*").eq("id", id).single()
  if (!oldData) return { error: "Not found" }
  
  const newState = !oldData.is_active
  
  const { error, data } = await supabase.from("provider_credentials").update({ 
    is_active: newState, 
    updated_at: new Date().toISOString() 
  }).eq("id", id).select().single()
  if (error) return { error: error.message }

  await logAudit({ action: "Update", entityType: "ProviderCredential", entityId: id, oldData, newData: { is_active: newState } })

  revalidatePath("/admin/providers", "layout")
  return { success: true, is_active: data.is_active }
}

export async function setDefaultCredential(id: string, provider_id: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  // Set all others to false
  await supabase.from("provider_credentials").update({ is_default: false }).eq("provider_id", provider_id).neq("id", id)
  
  // Set target to true
  const { error } = await supabase.from("provider_credentials").update({ is_default: true }).eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/admin/providers")
  return { success: true }
}

export async function saveProviderConfig(providerId: string, overrides: any) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("providers")
    .update({ overrides })
    .eq("provider_key", providerId)

  if (error) return { error: error.message }
  revalidatePath(`/admin/providers/${providerId}`)
  return { success: true }
}

export async function syncProviderModels(providerKey: string) {
  const supabase = createAdminClient()
  
  // 1. Get the primary active credential for this provider
  const { data: creds, error: credsErr } = await supabase
    .from("provider_credentials")
    .select("*")
    .eq("provider_id", providerKey)
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .limit(1)

  if (credsErr || !creds || creds.length === 0) {
    return { error: "No active credentials found for this provider." }
  }

  const credential = creds[0]

  try {
    let models: any[] = []
    
    if (providerKey === "elevenlabs") {
      const adapter = new ElevenLabsAdapter()
      models = await adapter.getModels(credential)
      
      // Transform into provider_models schema
      const mappedModels = models.map((m: any) => ({
        provider: providerKey,
        model_id: m.model_id,
        name: m.name,
        description: m.description,
        supports_tts: m.can_do_text_to_speech ?? true,
        supports_sts: m.can_do_voice_conversion ?? false,
        max_characters: m.token_cost_factor ? Math.floor(100000 / m.token_cost_factor) : null,
        is_active: true
      }))

      // Upsert
      for (const m of mappedModels) {
        await supabase
          .from("provider_models")
          .upsert(m, { onConflict: "provider, model_id" })
      }
    } else {
      return { error: "Model syncing not yet implemented for this provider." }
    }

    revalidatePath(`/admin/providers/${providerKey}`)
    return { success: true }
  } catch (err: any) {
    return { error: `Failed to sync models: ${err.message}` }
  }
}

export async function getOpenRouterModels(credentialId?: string, clientApiKey?: string) {
  await requireAdmin();
  let apiKey = clientApiKey;

  if (credentialId) {
    const supabase = createAdminClient();
    const { data: cred } = await supabase.from("provider_credentials").select("config_json").eq("id", credentialId).single();
    if (cred && cred.config_json) {
      apiKey = cred.config_json.apiKey || cred.config_json.api_key;
    }
  }

  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    
    const res = await fetch("https://openrouter.ai/api/v1/models", { headers });
    if (!res.ok) {
      return { success: false, error: `Failed to fetch models: ${res.status}` };
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.data)) {
      return { success: false, error: "Invalid response format from OpenRouter" };
    }

    const models = data.data.map((m: any) => {
      const parts = m.id.split("/");
      const provider = parts.length > 1 ? parts[0] : "other";
      return {
        id: m.id,
        name: m.name,
        provider: provider,
        contextLength: m.context_length,
        pricing: {
          prompt: m.pricing?.prompt,
          completion: m.pricing?.completion
        }
      };
    });

    return { success: true, models };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function testCredentialConnection(credential_id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  
  const { data: cred } = await supabase.from("provider_credentials").select("*, provider:providers(provider_key)").eq("id", credential_id).single();
  if (!cred) return { success: false, error: "Credential not found" };

  const providerKey = cred.provider?.provider_key;
  const config = cred.config_json || {};

  try {
    const startTime = Date.now();
    let res;

    if (providerKey === "openrouter") {
      const apiKey = cred.encrypted_key || config.apiKey || config.api_key;
      const defaultModel = config.default_model || config.defaultModel;
      
      if (!apiKey) return { success: false, error: "OPENROUTER_AUTH_FAILED: Missing API Key" };
      if (!defaultModel) return { success: false, error: "MODEL_NOT_SELECTED: Missing Default Model" };

      // Perform an actual completion test with max_tokens: 1
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: defaultModel,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 1
        })
      });

      const latency = Date.now() - startTime;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || `Status ${res.status}`;
        
        await supabase.from("provider_credentials").update({ health_status: PROVIDER_HEALTH_STATUS.OFFLINE, last_error: `Connection Failed: ${errMsg}`, last_checked_at: new Date().toISOString() }).eq("id", credential_id);
        
        let structuredError = "OPENROUTER_CONNECTION_FAILED";
        const lowerMsg = errMsg.toLowerCase();

        if (res.status === 401) {
           structuredError = "OPENROUTER_AUTH_FAILED";
        } else if (res.status === 402 || lowerMsg.includes("credit") || lowerMsg.includes("balance")) {
           structuredError = "OPENROUTER_INSUFFICIENT_CREDITS";
        } else if (res.status === 403) {
           structuredError = "MODEL_ACCESS_DENIED";
        } else if (res.status === 404 || lowerMsg.includes("does not exist") || lowerMsg.includes("model")) {
           structuredError = "MODEL_NOT_AVAILABLE";
        } else if (res.status === 429) {
           structuredError = "OPENROUTER_RATE_LIMITED";
        }
        
        return { success: false, error: structuredError, status: res.status, details: errMsg };
      }

      await supabase.from("provider_credentials").update({ health_status: PROVIDER_HEALTH_STATUS.HEALTHY, latency, last_error: null, last_checked_at: new Date().toISOString() }).eq("id", credential_id);
      return { success: true, latency, status: res.status };

    } else if (providerKey === "elevenlabs") {
      const apiKey = cred.encrypted_key || config.apiKey || config.api_key;
      if (!apiKey) return { success: false, error: "ELEVENLABS_AUTH_FAILED: Missing API Key" };

      res = await fetch("https://api.elevenlabs.io/v1/voices", { 
        headers: { "xi-api-key": apiKey.trim() },
        cache: "no-store"
      });
      const latency = Date.now() - startTime;
      if (!res.ok) {
        await supabase.from("provider_credentials").update({ health_status: PROVIDER_HEALTH_STATUS.OFFLINE, last_error: `Status ${res.status}`, last_checked_at: new Date().toISOString() }).eq("id", credential_id);
        return { success: false, error: `API returned status ${res.status}`, status: res.status };
      }
      await supabase.from("provider_credentials").update({ health_status: PROVIDER_HEALTH_STATUS.HEALTHY, latency, last_error: null, last_checked_at: new Date().toISOString() }).eq("id", credential_id);
      return { success: true, latency, status: res.status };
    } else {
      await supabase.from("provider_credentials").update({ health_status: PROVIDER_HEALTH_STATUS.HEALTHY, latency: 0, last_error: null, last_checked_at: new Date().toISOString() }).eq("id", credential_id);
      return { success: true, message: "Credential format looks valid. Deep test not implemented for this provider yet.", latency: 0 };
    }
  } catch (err: any) {
    await supabase.from("provider_credentials").update({ health_status: PROVIDER_HEALTH_STATUS.OFFLINE, last_error: err.message, last_checked_at: new Date().toISOString() }).eq("id", credential_id);
    return { success: false, error: err.message };
  }
}
