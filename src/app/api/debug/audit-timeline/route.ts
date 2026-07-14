import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { generateTimeline } from "@/app/(user)/projects/[id]/timeline-actions"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 })
  }

  const supabase = await createClient()
  const report: any = { projectId, steps: {} }

  try {
    // 1. Verify uploadProjectMedia
    const { data: mediaItems } = await supabase
      .from("project_media")
      .select("id, project_id, section_id, asset_type, mime_type")
      .eq("project_id", projectId)
    
    report.steps.step1_mediaItems = {
      count: mediaItems?.length || 0,
      items: mediaItems || []
    }

    // 2. Verify active script
    const { data: project } = await supabase
      .from("projects")
      .select("active_script_id")
      .eq("id", projectId)
      .single()

    let activeScriptMatch = null
    if (project?.active_script_id) {
      const { data: script } = await supabase
        .from("scripts")
        .select("id")
        .eq("id", project.active_script_id)
        .single()
      activeScriptMatch = script?.id || null
    }

    report.steps.step2_activeScript = {
      projects_active_script_id: project?.active_script_id || null,
      scripts_id_match: activeScriptMatch
    }

    // 3. Verify Section Media Count
    report.steps.step3_sectionMedia = []
    if (project?.active_script_id) {
      const { data: sections } = await supabase
        .from("script_sections")
        .select("id, section_index, title")
        .eq("script_id", project.active_script_id)
        .order("section_index", { ascending: true })

      if (sections) {
        for (const section of sections) {
          const { count } = await supabase
            .from("project_media")
            .select("*", { count: "exact", head: true })
            .eq("project_id", projectId)
            .eq("asset_type", "image")
            .eq("section_id", section.id)

          report.steps.step3_sectionMedia.push({
            section_id: section.id,
            section_index: section.section_index,
            title: section.title,
            assigned_image_count: count || 0
          })
        }
      }
    }

    // 6. Verify project_scenes BEFORE generate
    const { count: scenesBefore } = await supabase
      .from("project_scenes")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)

    report.steps.step6_scenes_before = scenesBefore || 0

    // 4. Verify generateTimeline() and 5. Verify replace_project_timeline RPC
    // We execute generateTimeline which will run the RPC internally
    const actionResult = await generateTimeline(projectId)
    report.steps.step4_generateTimeline_result = actionResult

    // 6b. Verify project_scenes AFTER generate
    const { count: scenesAfter } = await supabase
      .from("project_scenes")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)

    report.steps.step6_scenes_after = scenesAfter || 0

    return NextResponse.json({ success: true, report }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
