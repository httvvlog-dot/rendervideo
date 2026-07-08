import { createAdminClient } from "@/utils/supabase/admin"
import { PipelineStep } from "./types"

export class RuntimeLogger {
  async log(params: {
    providerId: string,
    credentialId: string,
    projectId?: string,
    step: PipelineStep,
    status: "success" | "failed" | "retrying",
    model?: string,
    durationMs?: number,
    cost?: number,
    tokens?: number,
    error?: any
  }) {
    const supabase = createAdminClient()
    
    let errorCode = null
    let errorMsg = null
    
    if (params.error) {
      errorMsg = params.error.message || String(params.error)
      if (errorMsg.includes("429")) errorCode = "429"
      else if (errorMsg.includes("401")) errorCode = "401"
      else if (errorMsg.includes("403")) errorCode = "403"
      else if (errorMsg.includes("500")) errorCode = "500"
      else errorCode = "UNKNOWN"
    }

    await supabase.from("runtime_logs").insert({
      provider_id: params.providerId,
      credential_id: params.credentialId,
      project_id: params.projectId || null,
      pipeline_step: params.step,
      status: params.status,
      model: params.model || null,
      duration_ms: params.durationMs || null,
      cost: params.cost || null,
      tokens: params.tokens || null,
      error_code: errorCode,
      error_message: errorMsg
    })
  }
}
