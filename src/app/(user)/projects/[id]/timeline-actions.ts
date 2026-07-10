"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { TimelineEngine } from "@/utils/timeline-engine"

export async function updateTargetDuration(projectId: string, duration: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase
    .from("projects")
    .update({ target_duration: duration })
    .eq("id", projectId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }
  
  // Optionally rebalance timeline here, but let's keep it separate
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function generateInitialTimeline(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Get project target duration
  const { data: project } = await supabase
    .from("projects")
    .select("target_duration")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()
    
  if (!project) return { error: "Project not found" }

  // Get project media to generate scenes
  const { data: mediaItems } = await supabase
    .from("project_media")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  if (!mediaItems || mediaItems.length === 0) {
    return { error: "No media found to generate timeline" }
  }

  // Clear existing scenes
  await supabase.from("project_scenes").delete().eq("project_id", projectId)

  const scenes = TimelineEngine.generateTimeline(mediaItems, project.target_duration)

  // Insert generated scenes
  const insertPayload = scenes.map(scene => ({
    project_id: projectId,
    media_id: scene.media_id,
    track_type: scene.track_type,
    sort_order: scene.sort_order,
    start_time: scene.start_time,
    end_time: scene.end_time,
    duration: scene.duration,
    effect: scene.animation,
    transition_type: scene.transition_type,
    locked: scene.locked
  }))

  const { error: insertError } = await supabase
    .from("project_scenes")
    .insert(insertPayload)

  if (insertError) return { error: insertError.message }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function updateSceneDuration(projectId: string, sceneId: string, duration: number, lock: boolean = true) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Verify project ownership
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single()
  if (!project) return { error: "Project not found" }

  const { error } = await supabase
    .from("project_scenes")
    .update({ 
      duration: duration,
      locked: lock 
    })
    .eq("id", sceneId)
    .eq("project_id", projectId)

  if (error) return { error: error.message }
  
  // Notice: Updating duration directly means start_time/end_time of subsequent scenes need adjusting.
  // The caller should ideally call autoBalanceTimeline right after, or we do it here.
  
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function autoBalanceTimeline(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Get project target duration
  const { data: project } = await supabase
    .from("projects")
    .select("target_duration")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()
    
  if (!project) return { error: "Project not found" }

  // Get all scenes ordered by sort_order
  const { data: scenes, error: sceneErr } = await supabase
    .from("project_scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })

  if (sceneErr) return { error: sceneErr.message }
  if (!scenes || scenes.length === 0) return { error: "No scenes to balance" }

  const updatedScenes = TimelineEngine.balanceTimeline(scenes, project.target_duration)

  // Update DB. Doing it sequentially or batched (upsert)
  // For safety and simplicity, we'll upsert
  const { error: upsertError } = await supabase
    .from("project_scenes")
    .upsert(
      updatedScenes.map(s => ({
        id: s.id,
        project_id: s.project_id,
        start_time: s.start_time,
        end_time: s.end_time,
        duration: s.duration,
        locked: s.locked
      }))
    )

  if (upsertError) return { error: upsertError.message }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
