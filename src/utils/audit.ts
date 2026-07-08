import { createClient } from "./supabase/server"

type AuditAction = "Create" | "Update" | "Archive" | "Delete"
type EntityType = "Provider" | "ProviderCredential" | "Prompt" | "Voice" | "Render" | "Settings"

interface AuditPayload {
  action: AuditAction
  entityType: EntityType
  entityId?: string
  oldData?: Record<string, any> | null
  newData?: Record<string, any> | null
}

/**
 * Utility to generate an audit log entry.
 * This should be called from Server Actions after performing CRUD operations.
 */
export async function logAudit(payload: AuditPayload) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.warn("[AUDIT] Attempted to log without authenticated user", payload)
    return
  }

  // Insert log
  const { error } = await supabase
    .from("audit_logs")
    .insert({
      user_id: user.id,
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      old_value: payload.oldData || null,
      new_value: payload.newData || null
    })

  if (error) {
    console.error("[AUDIT ERROR] Failed to write audit log:", error)
  }
}
