import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 })
  }

  const supabase = await createClient()
  const report: any = { projectId, steps: {} }

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin")
    const adminClient = createAdminClient()

    // 1. Project & Active Script Verification
    const { data: project } = await supabase.from("projects").select("active_script_id").eq("id", projectId).single()

    // 2. Fetch Project Scenes Before
    const { count: scenesBeforeUser } = await supabase
      .from("project_scenes")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      
    report.steps.step2_project_scenes_before_user_client = scenesBeforeUser || 0

    // 3. Raw RPC execution for audit
    // We will simulate exactly what generateTimeline does, but we catch the raw error
    let rawRpcResult = null;
    if (project?.active_script_id) {
      const { data: sections } = await supabase.from("script_sections").select("*").eq("script_id", project.active_script_id)
      const { data: mediaItems } = await supabase.from("project_media").select("*").eq("project_id", projectId).eq("asset_type", "image").not("section_id", "is", null)
      
      const newScenes: any[] = []
      // Just dummy mapping to trigger the RPC correctly
      if (sections && mediaItems) {
        let globalCursorMs = 0
        let sortOrder = 0
        for (const sec of sections) {
          const sMedia = mediaItems.filter(m => m.section_id === sec.id)
          if (sMedia.length > 0) {
            newScenes.push({
              media_id: sMedia[0].id,
              section_id: sec.id,
              duration: sec.duration_seconds,
              start_time: globalCursorMs,
              end_time: globalCursorMs + sec.duration_seconds,
              sort_order: sortOrder++
            })
            globalCursorMs += sec.duration_seconds
          }
        }
      }

      if (newScenes.length > 0) {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("replace_project_timeline", {
          p_project_id: projectId,
          p_script_id: project.active_script_id,
          p_scenes: newScenes,
          p_replace_existing: false
        })
        
        rawRpcResult = {
          data: rpcData,
          error: rpcErr ? {
            code: rpcErr.code,
            message: rpcErr.message,
            details: rpcErr.details,
            hint: rpcErr.hint
          } : null
        }
      }
    }
    
    report.steps.step3_raw_rpc_response = rawRpcResult

    // 4. Admin Scene Count
    const { count: adminScenesCount } = await adminClient
      .from("project_scenes")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      
    report.steps.step4_admin_scenes_count = adminScenesCount || 0

    // 5. Audit RLS Policies
    let rlsCheck = null;
    try {
      const res = await adminClient.rpc('exec_sql', { sql: 'SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = \'project_scenes\'' })
      rlsCheck = res.data;
    } catch(e) {
      rlsCheck = 'RPC exec_sql not available';
    }
    
    const { data: policies, error: policiesErr } = await adminClient
      .from("pg_policies")
      .select("*")
      .eq("tablename", "project_scenes")

    report.steps.step5_rls_audit = {
      table_rls_enabled_check: rlsCheck,
      policies: policies || [],
      error: policiesErr ? policiesErr.message : null
    }

    return NextResponse.json({ success: true, report }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
