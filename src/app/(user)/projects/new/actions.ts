"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
export async function createProject(formData: any) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }

  const supabase = await createClient()

  const parsedDuration = parseInt(formData.duration);
  if (isNaN(parsedDuration) || parsedDuration < 10 || parsedDuration > 3600) {
    throw new Error("Invalid duration. Must be between 10 and 3600 seconds.");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: formData.name || "Untitled Video",
      topic: formData.name, // keep for backwards compatibility if needed
      video_length: parsedDuration,
      target_duration: parsedDuration,
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

  return { id: data.id }
}
