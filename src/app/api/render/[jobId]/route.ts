import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params
    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: job, error: jobError } = await supabaseAdmin
      .from('render_jobs')
      .select('*, projects(user_id)')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Verify project ownership (the render job's project must belong to current user)
    // Supabase will return the joined projects object.
    const projectUserId = job.projects?.user_id
    if (projectUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Return only safe fields
    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      progressMessage: job.progress_message || null,
      outputUrl: job.output_url || null,
      previewUrl: job.preview_url || null,
      errorMessage: job.error_message || null,
      startedAt: job.started_at || null,
      finishedAt: job.finished_at || null
    })

  } catch (error: any) {
    console.error(`GET /api/render/[jobId] error:`, error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
