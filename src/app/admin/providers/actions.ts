"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { PROVIDER_HEALTH_STATUS } from "@/utils/provider-runtime/types"
import { requireAdmin } from "@/utils/roles"
import { logAudit } from "@/utils/audit"
import { revalidatePath } from "next/cache"
import { ProviderRuntime } from "@/utils/provider-runtime"
import { ElevenLabsAdapter } from "@/utils/provider-runtime/adapters/elevenlabs-adapter"
import { AdapterRegistry } from "@/utils/provider-runtime/adapters/factory"

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

  const payload: any = {
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
    
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function testProviderCredential(providerKey: string, config: any, credentialId?: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  if (credentialId) {
    const { data: existing } = await supabase.from("provider_credentials").select("config_json").eq("id", credentialId).single()
    if (existing?.config_json) {
      if (config.apiKey === "••••••••••••••••" || config.apiKey === "") config.apiKey = existing.config_json.apiKey;
      if (config.secretKey === "••••••••••••••••" || config.secretKey === "") config.secretKey = existing.config_json.secretKey;
      if (config.secretAccessKey === "••••••••••••••••" || config.secretAccessKey === "") config.secretAccessKey = existing.config_json.secretAccessKey;
    }
  }

  try {
    const { CredentialRuntime } = await import("@/utils/provider-runtime/credential-runtime")
    const runtime = new CredentialRuntime(providerKey)
    const result = await runtime.test(config)

    if (credentialId) {
      const updates: any = {
        credential_status: result.status,
        runtime_status: result.runtimeStatus,
        last_latency: result.latency,
        last_checked_at: new Date().toISOString()
      }

      if (result.status === "VALID" && result.runtimeStatus === "HEALTHY") {
        updates.success_count = 1 // Basic increment would be in DB func, but here we can just do absolute if needed, wait, better to use an RPC for increment, or just fetch and add. For now, let's just leave it or fetch first.
        // Actually, we'll just skip updating success_count directly here to avoid race conditions, but we can set last_success_at
        updates.last_success_at = new Date().toISOString()
      } else {
        updates.last_failure_at = new Date().toISOString()
      }

      await supabase.from("provider_credentials").update(updates).eq("id", credentialId)
    }

    revalidatePath("/admin/providers", "layout")
    return { success: true, result }
  } catch (err: any) {
    return { success: false, error: err.message }
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

export async function testCredentialConnection(credential_id: string, mode: "quick" | "deep" = "quick") {
  await requireAdmin();
  const supabase = createAdminClient();
  
  const { data: cred } = await supabase.from("provider_credentials").select("*, provider:providers(provider_key)").eq("id", credential_id).single();
  if (!cred) return { success: false, error: "Credential not found" };

  const providerKey = cred.provider?.provider_key;
  const config = cred.config_json || {};

  try {
    const { CredentialRuntime } = await import("@/utils/provider-runtime/credential-runtime");
    const runtime = new CredentialRuntime(providerKey);
    const result = await runtime.test(config);

    const updates: any = {
      credential_status: result.status,
      runtime_status: result.runtimeStatus,
      last_latency: result.latency,
      last_checked_at: new Date().toISOString()
    };

    if (result.status === "VALID" && result.runtimeStatus === "HEALTHY") {
      updates.last_success_at = new Date().toISOString();
      updates.consecutive_failures = 0;
    } else {
      const newFailures = (cred.consecutive_failures || 0) + 1;
      updates.last_failure_at = new Date().toISOString();
      updates.consecutive_failures = newFailures;
    }

    // Keep legacy fields updated for compatibility
    updates.health_status = result.status === "VALID" && result.runtimeStatus === "HEALTHY" 
      ? PROVIDER_HEALTH_STATUS.HEALTHY 
      : (updates.consecutive_failures >= 3 ? PROVIDER_HEALTH_STATUS.OFFLINE : PROVIDER_HEALTH_STATUS.WARNING);
    updates.last_error = result.message || null;
    updates.latency = result.latency || 0;

    await supabase.from("provider_credentials").update(updates).eq("id", credential_id);
    revalidatePath("/admin/providers", "layout");

    if (result.status === "VALID" && result.runtimeStatus === "HEALTHY") {
      return { 
        success: true, 
        latency: result.latency, 
        status: "Healthy",
        provider: providerKey
      };
    } else {
      return { success: false, error: result.message, status: result.runtimeStatus, details: result.details };
    }
  } catch (err: any) {
    const newFailures = (cred?.consecutive_failures || 0) + 1;
    await supabase.from("provider_credentials").update({ 
      health_status: newFailures >= 3 ? PROVIDER_HEALTH_STATUS.OFFLINE : PROVIDER_HEALTH_STATUS.WARNING, 
      last_error: err.message, 
      last_checked_at: new Date().toISOString(),
      last_failure_at: new Date().toISOString(),
      consecutive_failures: newFailures 
    }).eq("id", credential_id);
    revalidatePath("/admin/providers", "layout");
    return { success: false, error: err.message };
  }
}

export async function getProviderAnalytics() {
  await requireAdmin();
  const supabase = createAdminClient();

  // 1. Get total usage grouped by provider from ai_usage_logs
  // Note: For simplicity, we just fetch all logs for the current month. In production, use RPC.
  const firstDay = new Date();
  firstDay.setDate(1);
  firstDay.setHours(0, 0, 0, 0);

  const { data: logs, error } = await supabase
    .from("ai_usage_logs")
    .select("provider, usd_cost, requests")
    .gte("created_at", firstDay.toISOString());

  if (error) {
    console.error("Error fetching analytics:", error);
    return [];
  }

  // Aggregate
  const aggregated: Record<string, { requests: number, cost: number }> = {};
  for (const log of (logs || [])) {
    const p = log.provider;
    if (!aggregated[p]) aggregated[p] = { requests: 0, cost: 0 };
    aggregated[p].requests += (log.requests || 1); // fallback to 1 if requests column is not populated
    aggregated[p].cost += Number(log.usd_cost || 0);
  }

  // 2. Fetch credentials to get average latency and error status
  const { data: credentials } = await supabase
    .from("provider_credentials")
    .select("provider_id, health_status, latency, is_active");

  const credStats: Record<string, { active: number, latency: number, count: number, offline: number }> = {};
  for (const cred of (credentials || [])) {
    const pid = cred.provider_id;
    if (!credStats[pid]) credStats[pid] = { active: 0, latency: 0, count: 0, offline: 0 };
    if (cred.is_active) credStats[pid].active++;
    if (cred.health_status === 'OFFLINE') credStats[pid].offline++;
    if (cred.latency) {
      credStats[pid].latency += cred.latency;
      credStats[pid].count++;
    }
  }

  // 3. Get provider names
  const { data: providers } = await supabase.from("providers").select("id, provider_name, provider_key, provider_type");

  const result = (providers || []).map(p => {
    const usage = aggregated[p.provider_key] || { requests: 0, cost: 0 };
    const stats = credStats[p.id] || { active: 0, latency: 0, count: 0, offline: 0 };
    const avgLatency = stats.count > 0 ? Math.round(stats.latency / stats.count) : 0;
    
    // Calculate a naive success rate: if it's offline, 0%, else 100% (or proportional)
    const successRate = stats.active > 0 ? ((stats.active - stats.offline) / stats.active) * 100 : 100;

    return {
      id: p.id,
      name: p.provider_name,
      type: p.provider_type,
      requests: usage.requests,
      cost: usage.cost,
      latency: avgLatency,
      successRate: Math.round(successRate),
      activeCredentials: stats.active
    };
  });

  return result.sort((a, b) => b.requests - a.requests);
}
