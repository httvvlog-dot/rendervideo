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

async function buildTimelineCore(projectId: string, isRebuild: boolean): Promise<TimelineActionResult> {
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

  for (const section of sections) {
    const sectionMedia = mediaBySectionId.get(section.id) || []
    
    if (sectionMedia.length === 0) {
      missingSections.push({
        sectionId: section.id,
        sectionIndex: section.section_index,
        title: section.title
      })
      continue
    }

    const sectionDurationMs = Math.round(Number(section.duration_seconds) * 1000)
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

      newScenes.push({
        media_id: media.id,
        section_id: section.id,
        duration: durationMs / 1000.0,
        start_time: startTimeMs / 1000.0,
        end_time: endTimeMs / 1000.0,
        sort_order: globalSortOrder
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
