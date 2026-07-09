import { createAdminClient } from "@/utils/supabase/admin"

import { PROVIDER_HEALTH_STATUS } from "./types";

export class CredentialSelector {
  constructor(private providerKey: string) {}

  async getActiveCredentials() {
    const supabase = createAdminClient()
    
    const { data: provider, error: pErr } = await supabase
      .from("providers")
      .select("id")
      .eq("provider_key", this.providerKey)
      .single()

    if (pErr || !provider) throw new Error(`Provider ${this.providerKey} not found`)

    // Fetch all credentials for this provider
    const { data: credentials, error: cErr } = await supabase
      .from("provider_credentials")
      .select("*")
      .eq("provider_id", provider.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("priority", { ascending: false })

    if (cErr) throw new Error(cErr.message)

    // Filter out permanently offline ones
    const available = credentials.filter(c => c.health_status !== PROVIDER_HEALTH_STATUS.OFFLINE)
    
    // If all are offline, we still want to try them because we shouldn't completely block execution
    // unless they are explicitly is_active=false. 
    return available.length > 0 ? available : credentials
  }
}
