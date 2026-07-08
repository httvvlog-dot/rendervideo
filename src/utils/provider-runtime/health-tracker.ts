import { createAdminClient } from "@/utils/supabase/admin"

export class HealthTracker {
  constructor(private failureThreshold: number) {}

  async recordFailure(credentialId: string, error: any) {
    const supabase = createAdminClient()
    
    const { data: cred } = await supabase
      .from("provider_credentials")
      .select("failure_count")
      .eq("id", credentialId)
      .single()

    const currentFailures = (cred?.failure_count || 0) + 1
    
    let status = "warning"
    const errMsg = error.message?.toLowerCase() || ""
    if (errMsg.includes("429") || errMsg.includes("rate limit")) status = "rate_limited"
    else if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("unauthorized")) status = "unauthorized"
    else if (errMsg.includes("timeout")) status = "timeout"

    if (currentFailures >= this.failureThreshold) {
      status = "offline"
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
      health_status: "healthy",
      last_error: null,
      last_success_at: new Date().toISOString()
    }).eq("id", credentialId)
  }
}
