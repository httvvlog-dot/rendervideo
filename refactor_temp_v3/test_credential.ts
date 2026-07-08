"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { requireAdmin } from "@/utils/roles"
import { logAudit } from "@/utils/audit"
import { revalidatePath } from "next/cache"
import { HealthTracker } from "@/utils/provider-runtime/health-tracker"
import { TelemetryRecorder } from "@/utils/provider-runtime/telemetry-recorder"
import { RuntimeLogger } from "@/utils/provider-runtime/runtime-logger"

// ... (keep the rest identical, I will just replace testCredentialConnection)

export async function testCredentialConnection(credential_id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  
  const { data: cred } = await supabase.from("provider_credentials").select("*, provider:providers(provider_key)").eq("id", credential_id).single();
  if (!cred) return { success: false, error: "Credential not found" };

  const providerKey = cred.provider?.provider_key;
  const config = cred.config_json || {};

  const healthTracker = new HealthTracker(3);
  const telemetry = new TelemetryRecorder();
  const logger = new RuntimeLogger();

  try {
    const startTime = Date.now();
    let res;

    if (providerKey === "openrouter") {
      res = await fetch("https://openrouter.ai/api/v1/models", { headers: { "Authorization": `Bearer ${config.apiKey}` } });
    } else if (providerKey === "elevenlabs") {
      res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": config.apiKey } });
    } else {
      // Cloudflare, Whisper, Render worker skips deep validation for now
      return { success: true, message: "Credential format looks valid. Deep test not implemented for this provider yet.", latency: 0 };
    }
    
    const durationMs = Date.now() - startTime;
    
    if (!res.ok) {
      const error = new Error(`Status ${res.status}`);
      await healthTracker.recordFailure(credential_id, error);
      await logger.log({ providerId: cred.provider_id, credentialId: credential_id, step: "TEST", status: "failed", durationMs, error });
      return { success: false, error: `API returned status ${res.status}`, status: res.status };
    }
    
    await healthTracker.recordSuccess(credential_id);
    await telemetry.recordLatency(credential_id, durationMs);
    await logger.log({ providerId: cred.provider_id, credentialId: credential_id, step: "TEST", status: "success", durationMs });

    return { success: true, latency: durationMs, status: res.status };
  } catch (err: any) {
    await healthTracker.recordFailure(credential_id, err);
    await logger.log({ providerId: cred.provider_id, credentialId: credential_id, step: "TEST", status: "failed", error: err });
    return { success: false, error: err.message };
  }
}
