"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function deleteProject(projectId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()
  const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("user_id", user.id)

  if (error) throw new Error(error.message)
  revalidatePath("/projects")
  revalidatePath("/dashboard")
}

export async function duplicateProject(projectId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()
  
  // Get existing
  const { data: existing, error: fetchErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()
    
  if (fetchErr || !existing) throw new Error("Project not found")

  // Remove id, dates, and update title/status
  const { id, created_at, updated_at, ...copyData } = existing
  copyData.title = `${copyData.title} (Copy)`
  copyData.status = "draft"
  copyData.workflow_state = {
    research: "pending",
    script: "pending",
    scene: "pending",
    voice: "pending",
    subtitle: "pending",
    render: "pending"
  }

  const { data, error } = await supabase
    .from("projects")
    .insert(copyData)
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  
  revalidatePath("/projects")
  revalidatePath("/dashboard")
  return data.id
}

export async function updateProjectVoice(projectId: string, voicePresetId: string) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const supabase = await createClient()
  
  // 1. Update project's voice template
  const { error: projErr } = await supabase
    .from("projects")
    .update({ voice_template_id: voicePresetId })
    .eq("id", projectId)
    .eq("user_id", user.id)

  if (projErr) return { success: false, error: projErr.message }

  // 2. Also update user's default preference so new projects use it
  await supabase
    .from("profiles")
    .update({ default_voice_preset_id: voicePresetId })
    .eq("id", user.id)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
