import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, outputId: string }> }) {
  try {
    const { id: projectId, outputId } = await params
    if (!projectId || !outputId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const supabase = await createClient()

    const { error } = await supabase
      .from('project_outputs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', outputId)
      .eq('project_id', projectId)

    if (error) {
      console.error("Error soft-deleting output:", error)
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("API /projects/[id]/outputs/[outputId] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string, outputId: string }> }) {
  try {
    const { id: projectId, outputId } = await params
    if (!projectId || !outputId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const supabase = await createClient()

    // Unset current for all
    const { error: err1 } = await supabase
      .from('project_outputs')
      .update({ is_current: false })
      .eq('project_id', projectId)
      
    if (err1) throw err1

    // Set current for the selected one
    const { error: err2 } = await supabase
      .from('project_outputs')
      .update({ is_current: true })
      .eq('id', outputId)
      .eq('project_id', projectId)

    if (err2) throw err2

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("API /projects/[id]/outputs/[outputId] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string, outputId: string }> }) {
  try {
    const { id: projectId, outputId } = await params
    if (!projectId || !outputId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const urlParams = new URL(req.url).searchParams
    const forceDownload = urlParams.get('download') === '1'

    const supabase = await createClient()
    
    // Fetch the output
    const { data: output, error } = await supabase
      .from('project_outputs')
      .select('*')
      .eq('id', outputId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single()

    if (error || !output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 })
    }

    if (!output.output_key) {
      // Fallback if output_key is missing
      if (forceDownload && output.output_url) {
        return NextResponse.redirect(output.output_url)
      }
      return NextResponse.json({ url: output.output_url })
    }

    // Generate Signed URL
    const { ProviderRuntime, CloudflareR2Adapter } = await import("@/utils/provider-runtime")
    const { CredentialSelector } = await import("@/utils/provider-runtime/credential-selector")
    
    const selector = new CredentialSelector("cloudflare_r2")
    const creds = await selector.getActiveCredentials()
    
    if (!creds || creds.length === 0) {
      return NextResponse.json({ error: "No storage configuration found" }, { status: 500 })
    }

    const adapter = new CloudflareR2Adapter()
    
    // Try to generate signed url from the first valid credential
    for (const cred of creds) {
      try {
        const signedUrl = await adapter.generateSignedUrl(cred, output.output_key, forceDownload)
        if (forceDownload) {
          return NextResponse.redirect(signedUrl)
        } else {
          return NextResponse.json({ url: signedUrl })
        }
      } catch (err) {
        console.warn("Failed to generate signed url with credential", cred.credential_name, err)
      }
    }

    // If all fail, fallback to output_url
    if (forceDownload && output.output_url) {
      return NextResponse.redirect(output.output_url)
    }
    
    return NextResponse.json({ url: output.output_url || "" })
  } catch (error: any) {
    console.error("API /projects/[id]/outputs/[outputId] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
