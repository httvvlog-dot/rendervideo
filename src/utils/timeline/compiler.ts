import { createClient } from "@/utils/supabase/server"
import { TimelineJSON, SceneJSON, AssetJSON, RenderPreset } from "../render/types"
import crypto from "crypto"

export class TimelineCompiler {
  static async compile(projectId: string, presetId: string): Promise<TimelineJSON> {
    const supabase = await createClient()

    // 1. Fetch Project
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single()
    
    if (pErr || !project) throw new Error("Project not found")

    // 2. Fetch Preset
    const { data: preset, error: preErr } = await supabase
      .from("render_presets")
      .select("*")
      .eq("id", presetId)
      .single()
    
    if (preErr || !preset) throw new Error("Preset not found")

    // 3. Fetch Scenes (joined with project_media/project_assets conceptually, 
    // but here we just fetch scenes and gather unique media IDs)
    const { data: scenes, error: sErr } = await supabase
      .from("project_scenes")
      .select("*, project_media(*)")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })

    if (sErr || !scenes) throw new Error("Failed to fetch scenes")

    // 4. Build Assets Manifest
    const assetsMap = new Map<string, AssetJSON>()
    scenes.forEach(scene => {
      if (scene.project_media && scene.project_media.public_url) {
        assetsMap.set(scene.media_id, {
          id: scene.media_id,
          type: "image", // can expand logic here based on mime_type
          url: scene.project_media.public_url
        })
      }
      // TODO: Also map voice_asset_id, music_asset_id to assets map if they exist
    })

    // 5. Build Scene JSON array
    const compiledScenes: SceneJSON[] = scenes.map(scene => ({
      id: scene.id,
      duration: scene.duration,
      media_id: scene.media_id,
      transition: scene.transition_type ? {
        type: scene.transition_type,
        parameters: scene.transition_parameters || {}
      } : undefined,
      animation: scene.effect ? {
        type: scene.effect,
        start_scale: scene.start_scale,
        end_scale: scene.end_scale,
        start_x: scene.start_x,
        end_x: scene.end_x,
        start_y: scene.start_y,
        end_y: scene.end_y,
        anchor: scene.anchor,
        easing: scene.easing,
        curve: scene.curve || "linear"
      } : undefined,
      // Add caption, filter etc here
    }))

    // 6. Assemble TimelineJSON
    const timeline: TimelineJSON = {
      version: 1,
      project: {
        id: project.id,
        timeline_hash: "", // calculate below
      },
      video: {
        fps: preset.fps,
        width: preset.width,
        height: preset.height
      },
      assets: Array.from(assetsMap.values()),
      tracks: ["video"], // Add more tracks as they are populated
      scenes: compiledScenes,
      metadata: {
        preset_name: preset.name
      }
    }

    // 7. Calculate Hash
    const hash = crypto.createHash('sha256').update(JSON.stringify(timeline)).digest('hex')
    timeline.project.timeline_hash = hash

    return timeline
  }
}
