import { SupabaseClient } from "@supabase/supabase-js"
import { TimelineJSON, RenderScene } from "./core"

export async function compileTimeline(supabase: SupabaseClient, projectId: string): Promise<TimelineJSON> {
  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Unauthorized")

  // 2. Read project and verify ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) throw new Error("Project not found")
  if (project.user_id !== user.id) throw new Error("Forbidden")

  // 3. Read project_scenes ordered by sort_order
  const { data: scenes, error: scenesError } = await supabase
    .from('project_scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (scenesError || !scenes) throw new Error("Failed to fetch scenes")
  if (scenes.length === 0) throw new Error("Timeline is empty")

  // 4. Resolve media_id to project_media.public_url
  const mediaIds = scenes.map(s => s.media_id).filter(Boolean)
  let projectMedia: any[] = []
  if (mediaIds.length > 0) {
    const { data: mediaData } = await supabase
      .from('project_media')
      .select('*')
      .in('id', mediaIds)
    if (mediaData) projectMedia = mediaData
  }

  const mediaMap = new Map(projectMedia.map(m => [m.id, m]))

  // 5 & 6 & 7. Convert to integer ms, validate timing and media
  let totalDurationMs = 0
  const renderScenes: RenderScene[] = []

  for (const scene of scenes) {
    const startTimeMs = Math.round(Number(scene.start_time) * 1000)
    const endTimeMs = Math.round(Number(scene.end_time) * 1000)
    const durationMs = Math.round(Number(scene.duration) * 1000)

    // Validations
    if (startTimeMs < 0) throw new Error(`Scene ${scene.id} has negative start time`)
    if (durationMs <= 0) throw new Error(`Scene ${scene.id} has zero or negative duration`)
    if (endTimeMs <= startTimeMs) throw new Error(`Scene ${scene.id} end time <= start time`)
    
    // Strict duration parity validation (preventing DB desync)
    if (endTimeMs - startTimeMs !== durationMs) {
      throw new Error(`Scene ${scene.id} duration mismatch: ${endTimeMs} - ${startTimeMs} != ${durationMs}`)
    }

    if (!scene.media_id) throw new Error(`Scene ${scene.id} has no media_id`)
    const media = mediaMap.get(scene.media_id)
    if (!media || !media.public_url) throw new Error(`Scene ${scene.id} references missing or unresolved media`)

    const transitionDurationMs = Math.round(Number(scene.transition_duration || 0) * 1000)

    renderScenes.push({
      id: scene.id,
      sectionId: scene.section_id || null,
      mediaId: scene.media_id,
      sourceUrl: media.public_url,
      
      startTimeMs,
      endTimeMs,
      durationMs,
      
      transition: {
        type: scene.transition_type || 'none',
        durationMs: transitionDurationMs
      },
      transform: {
        startScale: Number(scene.start_scale ?? 1.0),
        endScale: Number(scene.end_scale ?? 1.0),
        startX: Number(scene.start_x ?? 0.0),
        endX: Number(scene.end_x ?? 0.0),
        startY: Number(scene.start_y ?? 0.0),
        endY: Number(scene.end_y ?? 0.0),
        opacity: Number(scene.opacity ?? 1.0)
      }
    })

    if (endTimeMs > totalDurationMs) {
      totalDurationMs = endTimeMs
    }
  }

  // Final total duration validation
  // Actually, we could just rely on the last scene's end time, but let's use the max end time.
  
  // 8. Produce canonical TimelineJSON
  const timelineJSON: TimelineJSON = {
    version: 1,
    projectId: project.id,
    timelineVersion: project.timeline_version || 1,
    totalDurationMs,
    preset: {
      aspectRatio: "9:16",
      width: 1080,
      height: 1920,
      fps: 30,
      codec: "h264"
    },
    scenes: renderScenes
  }

  return timelineJSON
}
