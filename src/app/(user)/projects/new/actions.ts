"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
import { redirect } from "next/navigation"

export async function createProject(formData: any) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: formData.name || "Untitled Video",
      topic: formData.name, // keep for backwards compatibility if needed
      video_length: parseInt(formData.duration) || 60,
      status: "draft",
      workflow_state: {
        render: "pending"
      }
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/projects/${data.id}`)
}
