import { createAdminClient } from "@/utils/supabase/admin"

export class TelemetryRecorder {
  async recordLatency(credentialId: string, latencyMs: number) {
    const supabase = createAdminClient()
    
    const { data: cred } = await supabase
      .from("provider_credentials")
      .select("success_count, average_latency")
      .eq("id", credentialId)
      .single()

    const currentSuccess = cred?.success_count || 0
    const currentAvg = cred?.average_latency || latencyMs

    const newSuccess = currentSuccess + 1
    const newAvg = Math.round(((currentAvg * currentSuccess) + latencyMs) / newSuccess)

    await supabase.from("provider_credentials").update({
      success_count: newSuccess,
      last_latency: latencyMs,
      average_latency: newAvg
    }).eq("id", credentialId)
  }
}
