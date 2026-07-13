export type PreviewScene = {
  id: string
  mediaId: string
  sectionId: string | null
  sortOrder: number
  startTimeMs: number
  endTimeMs: number
  durationMs: number
  publicUrl: string | null
  transitionType: string | null
  transitionDurationMs: number
  startScale: number
  endScale: number
  startX: number
  endX: number
  startY: number
  endY: number
  opacity: number
}

export function normalizePreviewScenes(dbScenes: any[], projectMedia: any[]): PreviewScene[] {
  // Build a fast lookup map for media
  const mediaById = new Map(projectMedia.map(m => [m.id, m]))

  // Normalize all scenes
  const previewScenes: PreviewScene[] = dbScenes.map(scene => {
    const media = scene.media_id ? mediaById.get(scene.media_id) : null
    
    return {
      id: scene.id,
      mediaId: scene.media_id,
      sectionId: scene.section_id || null,
      sortOrder: scene.sort_order || 0,
      
      // Strict integer millisecond normalization
      startTimeMs: Math.round(Number(scene.start_time) * 1000),
      endTimeMs: Math.round(Number(scene.end_time) * 1000),
      durationMs: Math.round(Number(scene.duration) * 1000),
      
      // Media resolution
      publicUrl: media ? media.public_url : null,
      
      // Effects and Transitions
      transitionType: scene.transition_type || null,
      transitionDurationMs: Math.round(Number(scene.transition_duration || 0) * 1000),
      
      // Transform (Ken Burns support)
      startScale: Number(scene.start_scale ?? 1.0),
      endScale: Number(scene.end_scale ?? 1.0),
      startX: Number(scene.start_x ?? 0.0),
      endX: Number(scene.end_x ?? 0.0),
      startY: Number(scene.start_y ?? 0.0),
      endY: Number(scene.end_y ?? 0.0),
      opacity: Number(scene.opacity ?? 1.0)
    }
  })

  // Sort chronologically just in case DB returned out of order
  return previewScenes.sort((a, b) => a.startTimeMs - b.startTimeMs)
}
