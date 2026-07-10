"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"

export async function generateTimeline(projectId: string, targetDuration: number, newUploadCount: number) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")

  const supabase = await createClient()

  // 1. Fetch all media
  const { data: mediaItems, error: mediaError } = await supabase
    .from("project_media")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  if (mediaError) throw new Error(mediaError.message)
  if (!mediaItems || mediaItems.length === 0) return { success: true }

  // 2. Fetch existing scenes
  const { data: scenes, error: scenesError } = await supabase
    .from("project_scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })

  if (scenesError) throw new Error(scenesError.message)

  const existingScenes = scenes || []
  const existingMediaIds = new Set(existingScenes.map(s => s.media_id))

  // 3. Find newly uploaded media that are not in the timeline
  const newMediaItems = mediaItems.filter(m => !existingMediaIds.has(m.id))

  if (newMediaItems.length === 0) return { success: true } // Nothing to append

  // 4. Calculate duration
  let durationToApply = 5.0 // fallback
  
  if (existingScenes.length === 0) {
    // Initial generation: Divide target duration equally
    durationToApply = targetDuration / newMediaItems.length
    // round to 1 decimal
    durationToApply = Math.max(1, Math.round(durationToApply * 10) / 10)
  } else {
    // Append Equal logic: Average of existing scenes
    const totalExistingDuration = existingScenes.reduce((sum, s) => sum + s.duration, 0)
    durationToApply = totalExistingDuration / existingScenes.length
    durationToApply = Math.max(1, Math.round(durationToApply * 10) / 10)
  }

  // 5. Create new scenes
  const newScenesToInsert = newMediaItems.map((media, index) => {
    return {
      project_id: projectId,
      media_id: media.id,
      duration: durationToApply,
      sort_order: existingScenes.length + index,
      start_time: 0, // start_time will be calculated dynamically by the compiler
      easing: "linear",
      start_scale: 1.0,
      end_scale: 1.0,
      start_x: 0,
      end_x: 0,
      start_y: 0,
      end_y: 0,
      transition_parameters: {}
    }
  })

  const { error: insertError } = await supabase
    .from("project_scenes")
    .insert(newScenesToInsert)

  if (insertError) throw new Error(insertError.message)

  return { success: true }
}
