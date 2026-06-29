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

  // Insert project
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: formData.topic || "Untitled Video",
      topic: formData.topic,
      language: formData.language || "vi",
      video_length: parseInt(formData.duration) || 10,
      // Leaving templates null for now since they are optional and we don't have records yet
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

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/projects/${data.id}`)
}
