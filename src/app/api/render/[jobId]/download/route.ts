import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const urlParams = new URL(req.url).searchParams;
    const action = urlParams.get("action"); // 'play' | 'download'
    const forceDownload = action === "download";

    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = authData.user.id;

    // 1. Get the render job
    const { data: job, error: jobErr } = await supabase
      .from("render_jobs")
      .select("project_id, output_url")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!job.output_url) {
      return NextResponse.json({ error: "Video not ready" }, { status: 404 });
    }

    // 2. Verify ownership of the project
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id")
      .eq("id", job.project_id)
      .eq("user_id", userId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: "Forbidden: You do not own this project" }, { status: 403 });
    }

    // 3. Extract objectKey from public URL
    // Public URL format: https://pub-[hash].r2.dev/renders/[projectId]/[jobId]/output.mp4
    let objectKey = "";
    try {
      const parsedUrl = new URL(job.output_url);
      objectKey = parsedUrl.pathname;
      if (objectKey.startsWith("/")) {
        objectKey = objectKey.substring(1);
      }
    } catch (e) {
      return NextResponse.json({ error: "Invalid output URL in database" }, { status: 500 });
    }

    // 4. Generate Signed URL
    const { CloudflareR2Adapter } = await import("@/utils/provider-runtime/adapters/cloudflare-r2-adapter");
    const { CredentialSelector } = await import("@/utils/provider-runtime/credential-selector");
    
    const selector = new CredentialSelector("cloudflare_r2");
    const creds = await selector.getActiveCredentials();
    
    if (!creds || creds.length === 0) {
      return NextResponse.json({ error: "Storage credentials not found" }, { status: 500 });
    }

    const adapter = new CloudflareR2Adapter();
    let signedUrl = "";
    
    for (const cred of creds) {
      try {
        signedUrl = await adapter.generateSignedUrl(cred, objectKey, forceDownload);
        if (signedUrl) break;
      } catch (err) {
        console.warn("Failed to generate signed url with credential", cred.credential_name, err);
      }
    }

    if (!signedUrl) {
      // Fallback to public URL if signing strictly fails
      signedUrl = job.output_url;
    }

    return NextResponse.redirect(signedUrl);

  } catch (error: any) {
    console.error("API /render/[jobId]/download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
