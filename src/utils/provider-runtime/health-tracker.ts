import { createAdminClient } from "@/utils/supabase/admin"
import { PROVIDER_HEALTH_STATUS, ProviderHealthStatus } from "./types"

export class HealthTracker {
  constructor(private failureThreshold: number) {}

  async recordFailure(credentialId: string, error: any): Promise<{ status: ProviderHealthStatus, currentFailures: number }> {
    const supabase = createAdminClient()
    
    const { data: cred } = await supabase
      .from("provider_credentials")
      .select("failure_count")
      .eq("id", credentialId)
      .single()

    const currentFailures = (cred?.failure_count || 0) + 1
    
    let status: ProviderHealthStatus = PROVIDER_HEALTH_STATUS.WARNING
    const errMsg = error.message?.toLowerCase() || ""
    if (errMsg.includes("429") || errMsg.includes("rate limit")) status = PROVIDER_HEALTH_STATUS.RATE_LIMITED
    else if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("unauthorized")) status = PROVIDER_HEALTH_STATUS.UNAUTHORIZED
    else if (errMsg.includes("timeout")) status = PROVIDER_HEALTH_STATUS.TIMEOUT

    if (currentFailures >= this.failureThreshold) {
      status = PROVIDER_HEALTH_STATUS.OFFLINE
    }

    await supabase.from("provider_credentials").update({
      failure_count: currentFailures,
      health_status: status,
      last_error: error.message || "Unknown error",
      last_failure_at: new Date().toISOString()
    }).eq("id", credentialId)

    return { status, currentFailures }
  }

  async recordSuccess(credentialId: string) {
    const supabase = createAdminClient()
    await supabase.from("provider_credentials").update({
      failure_count: 0,
      health_status: PROVIDER_HEALTH_STATUS.HEALTHY,
      last_error: null,
      last_success_at: new Date().toISOString()
    }).eq("id", credentialId)
  }
}
