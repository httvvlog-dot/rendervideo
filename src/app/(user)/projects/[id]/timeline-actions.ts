"use server"

import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"
import { revalidatePath } from "next/cache"

export type TimelineActionResult =
  | { success: true; code: "TIMELINE_CREATED"; sceneCount: number; totalDurationMs: number }
  | { success: true; code: "TIMELINE_REBUILT"; sceneCount: number; totalDurationMs: number }
  | { success: false; code: "TIMELINE_ALREADY_EXISTS"; existingSceneCount: number }
  | { success: false; code: "SECTION_MEDIA_MISSING"; missingSections: Array<{ sectionId: string; sectionIndex: number; title: string | null }> }
  | { success: false; code: "NO_ACTIVE_SCRIPT" }
  | { success: false; code: "INVALID_ACTIVE_SCRIPT" }
  | { success: false; code: "TIMELINE_VALIDATION_FAILED"; message: string }

async function buildTimelineCore(projectId: string, isRebuild: boolean = false, useVoiceDuration: boolean = false): Promise<TimelineActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, code: "TIMELINE_VALIDATION_FAILED", message: "Unauthorized" }

  const supabase = await createClient()

  // 1. Verify project and active script securely
  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id, active_script_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (!project) return { success: false, code: "TIMELINE_VALIDATION_FAILED", message: "Project not found or access denied" }
  if (!project.active_script_id) return { success: false, code: "NO_ACTIVE_SCRIPT" }

  const { data: activeScript } = await supabase
    .from("scripts")
    .select("id, project_id")
    .eq("id", project.active_script_id)
    .single()

  if (!activeScript || activeScript.project_id !== projectId) {
    return { success: false, code: "INVALID_ACTIVE_SCRIPT" }
  }

  // 2. Fetch sections
  const { data: sections, error: sectionsErr } = await supabase
    .from("script_sections")
    .select("*")
    .eq("script_id", project.active_script_id)
    .order("section_index", { ascending: true })

  if (sectionsErr || !sections || sections.length === 0) {
    return { success: false, code: "TIMELINE_VALIDATION_FAILED", message: "No sections found in the active script." }
  }

  // 3. Fetch all assigned media for this project
  const { data: mediaItems, error: mediaErr } = await supabase
    .from("project_media")
    .select("*")
    .eq("project_id", projectId)
    .eq("asset_type", "image")
    .not("section_id", "is", null)
    .order("section_sort_order", { ascending: true })

  if (mediaErr) return { success: false, code: "TIMELINE_VALIDATION_FAILED", message: "Failed to fetch media." }

  const mediaBySectionId = new Map<string, any[]>()
  for (const media of mediaItems || []) {
    if (!mediaBySectionId.has(media.section_id)) {
      mediaBySectionId.set(media.section_id, [])
    }
    mediaBySectionId.get(media.section_id)!.push(media)
  }

  // 4. Construct scenes with strict assertions
  const newScenes = []
  const missingSections = []
  let globalCursorMs = 0
  let globalSortOrder = 0
  let expectedGlobalTotalMs = 0

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx]
    const sectionMedia = mediaBySectionId.get(section.id) || []
    
    if (sectionMedia.length === 0) {
      missingSections.push({
        sectionId: section.id,
        sectionIndex: section.section_index,
        title: section.title
      })
      continue
    }

    let sectionDurationMs = Math.round(Number(section.duration_seconds) * 1000)
    
    if (useVoiceDuration) {
      if (section.voice_duration_ms) {
        sectionDurationMs = Number(section.voice_duration_ms)
      } else {
        // If there's no voice, what to do? User requirement says:
        // "Each section with voice must have at least one image scene." 
        // If there is no voice, we probably fallback to AI duration so that timeline still generates.
        // Wait, "Generate Voice -> Sync Timeline to Voice". We will just fallback to original duration if voice_duration_ms is missing.
      }
    }
    expectedGlobalTotalMs += sectionDurationMs
    
    const mediaCount = sectionMedia.length
    const baseDurationMs = Math.floor(sectionDurationMs / mediaCount)
    const remainderMs = sectionDurationMs - (baseDurationMs * mediaCount)

    let actualSectionAccumulatorMs = 0

    for (let i = 0; i < mediaCount; i++) {
      const media = sectionMedia[i]
      const isLastMedia = i === mediaCount - 1
      const durationMs = isLastMedia ? baseDurationMs + remainderMs : baseDurationMs

      // Assertions
      if (durationMs <= 0) {
        return { success: false, code: "TIMELINE_VALIDATION_FAILED", message: `Scene duration <= 0 calculated in section ${section.section_index}` }
      }

      const startTimeMs = globalCursorMs
      const endTimeMs = startTimeMs + durationMs

      let transitionType = section.transition_type || 'fade'
      let transitionDuration = section.transition_duration || 0.5

      // If it's the last media in the section, and there is a next section, use next section's transition
      if (isLastMedia && sIdx < sections.length - 1) {
        const nextSection = sections[sIdx + 1]
        transitionType = nextSection.transition_type || 'fade'
        transitionDuration = nextSection.transition_duration || 0.5
      }

      newScenes.push({
        media_id: media.id,
        section_id: section.id,
        duration: durationMs / 1000.0,
        start_time: startTimeMs / 1000.0,
        end_time: endTimeMs / 1000.0,
        sort_order: globalSortOrder,
        transition_type: transitionType,
        transition_duration: transitionDuration
      })

      actualSectionAccumulatorMs += durationMs
      globalCursorMs = endTimeMs
      globalSortOrder++
    }

    // Final section assertion
    if (actualSectionAccumulatorMs !== sectionDurationMs) {
      return { success: false, code: "TIMELINE_VALIDATION_FAILED", message: `Math invariant violation: Section ${section.section_index} sum (${actualSectionAccumulatorMs}ms) does not match target (${sectionDurationMs}ms)` }
    }
  }

  if (missingSections.length > 0) {
    return { success: false, code: "SECTION_MEDIA_MISSING", missingSections }
  }

  // Global assertions
  if (globalCursorMs !== expectedGlobalTotalMs) {
    return { success: false, code: "TIMELINE_VALIDATION_FAILED", message: `Math invariant violation: Global timeline total (${globalCursorMs}ms) does not match target (${expectedGlobalTotalMs}ms)` }
  }

  // 5. Atomic RPC execution
  const { error: rpcErr } = await supabase.rpc("replace_project_timeline", {
    p_project_id: projectId,
    p_script_id: project.active_script_id,
    p_scenes: newScenes,
    p_replace_existing: isRebuild
  })

  if (rpcErr) {
    if (rpcErr.message.includes("TIMELINE_ALREADY_EXISTS")) {
      const { count } = await supabase.from("project_scenes").select("*", { count: "exact", head: true }).eq("project_id", projectId)
      return { success: false, code: "TIMELINE_ALREADY_EXISTS", existingSceneCount: count || 0 }
    }
    return { success: false, code: "TIMELINE_VALIDATION_FAILED", message: rpcErr.message }
  }

  revalidatePath(`/projects/${projectId}`)
  
  if (isRebuild) {
    return { success: true, code: "TIMELINE_REBUILT", sceneCount: newScenes.length, totalDurationMs: expectedGlobalTotalMs }
  }
  return { success: true, code: "TIMELINE_CREATED", sceneCount: newScenes.length, totalDurationMs: expectedGlobalTotalMs }
}

export async function generateTimeline(projectId: string): Promise<TimelineActionResult> {
  return await buildTimelineCore(projectId, false)
}

export async function rebuildTimeline(projectId: string): Promise<TimelineActionResult> {
  return await buildTimelineCore(projectId, true)
}

export async function syncTimelineToVoice(projectId: string): Promise<TimelineActionResult> {
  return await buildTimelineCore(projectId, true, true)
}

export async function updateTimelineDurations(projectId: string, updates: { id: string, durationMs: number, startTimeMs: number, endTimeMs: number }[]) {
  const supabase = await createClient()
  
  // Parallel updates for safety and simplicity, maintaining backward compatibility 
  // by writing start_time and end_time for the video renderer
  const promises = updates.map(update => 
    supabase.from("project_scenes")
      .update({ 
        duration: update.durationMs / 1000.0,
        start_time: update.startTimeMs / 1000.0,
        end_time: update.endTimeMs / 1000.0
      })
      .eq("id", update.id)
      .eq("project_id", projectId)
  )
  
  const results = await Promise.all(promises)
  const hasError = results.some(r => r.error)
  
  if (hasError) {
    return { success: false, message: "Failed to save timeline adjustments" }
  }
  
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
