"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function createProject(formData: any) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: formData.topic || "Untitled Video",
      topic: formData.topic,
      language: formData.language || "vi",
      video_length: parseInt(formData.duration) || 10,
      status: "draft",
      workflow_state: {
        research: "pending",
        script: "pending",
        scene: "pending",
        voice: "pending",
        subtitle: "pending",
        render: "pending"
      }
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  redirect(`/projects/${data.id}`)
}

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
  copyData.title = \`\${copyData.title} (Copy)\`
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
