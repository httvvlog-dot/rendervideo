import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    if (!projectId) return NextResponse.json({ error: "Missing project id" }, { status: 400 })

    const supabase = await createClient()

    // Authentication and ownership check is handled implicitly by RLS.
    // If the user doesn't own the project, they will get 0 results.
    
    // Fetch latest current output
    const { data: latest, error: latestError } = await supabase
      .from('project_outputs')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .single()

    // Fetch history (all outputs)
    const { data: history, error: historyError } = await supabase
      .from('project_outputs')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: false })

    if (historyError && historyError.code !== 'PGRST116') {
      console.error("Error fetching project history:", historyError)
      return NextResponse.json({ error: "Failed to fetch project outputs" }, { status: 500 })
    }

    return NextResponse.json({
      latest: latest || null,
      history: history || []
    })
  } catch (error: any) {
    console.error("API /projects/[id]/outputs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
