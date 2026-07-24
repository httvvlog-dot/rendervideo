import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { compileTimeline } from "@/utils/render/compile-timeline"
import { RENDER_JOB_STATUS } from "@/utils/render/core"
import { z } from "zod"
import { calculateRenderCost } from "@/utils/billing/render-cost"

const TransformSchema = z.object({
  startScale: z.number(),
  endScale: z.number(),
  startX: z.number(),
  endX: z.number(),
  startY: z.number(),
  endY: z.number(),
  opacity: z.number(),
}).strict()

const TransitionSchema = z.object({
  type: z.string(),
  durationMs: z.number().nonnegative(),
}).strict()

const RenderSceneSchema = z.object({
  id: z.string(),
  sectionId: z.string().nullable(),
  mediaId: z.string(),
  sourceUrl: z.string().url(),
  startTimeMs: z.number().nonnegative(),
  endTimeMs: z.number().positive(),
  durationMs: z.number().positive(),
  transition: TransitionSchema,
  transform: TransformSchema,
}).strict()

const RenderAudioTrackSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("voice"),
  sectionId: z.string().uuid(),
  mediaId: z.string().uuid(),
  sourceUrl: z.string().url(),
  startTimeMs: z.number().nonnegative(),
  durationMs: z.number().positive(),
}).strict()

const TimelineJSONSchema = z.object({
  version: z.literal(1),
  projectId: z.string().uuid(),
  timelineVersion: z.number(),
  totalDurationMs: z.number().positive(),
  preset: z.object({
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
    width: z.number().positive(),
    height: z.number().positive(),
    fps: z.number().positive(),
    codec: z.string(),
  }).strict(),
  scenes: z.array(RenderSceneSchema).min(1),
  audioTracks: z.array(RenderAudioTrackSchema).optional(),
}).strict()

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json()
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 })
    }

    const supabase = await createClient()
    
    // compileTimeline handles user auth, ownership validation, and DB reading
    const timeline = await compileTimeline(supabase, projectId)
    
    // B4 Snapshot Validation
    const validatedTimeline = TimelineJSONSchema.parse(timeline)

    // D10 Prevent Duplicate Active Jobs
    const activeStatuses = [
      RENDER_JOB_STATUS.QUEUED,
      RENDER_JOB_STATUS.PREPARING,
      RENDER_JOB_STATUS.DOWNLOADING,
      RENDER_JOB_STATUS.RENDERING,
      RENDER_JOB_STATUS.ENCODING,
      RENDER_JOB_STATUS.UPLOADING
    ]

    // Create an admin client to bypass RLS for inserting the job. 
    // This is safe because compileTimeline already verified project ownership.
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    
    const { data: existingActiveJobs } = await supabaseAdmin
      .from('render_jobs')
      .select('id, status')
      .eq('project_id', projectId)
      .in('status', activeStatuses)
      .limit(1)

    if (existingActiveJobs && existingActiveJobs.length > 0) {
      return NextResponse.json({
        jobId: existingActiveJobs[0].id,
        status: existingActiveJobs[0].status,
        message: "Returned existing active job"
      })
    }

    let presetSnapshot = {
      width: validatedTimeline.preset.width,
      height: validatedTimeline.preset.height,
      fps: validatedTimeline.preset.fps,
      codec: validatedTimeline.preset.codec,
      quality: "Standard" // fallback
    };

    const { data: project } = await supabase
      .from('projects')
      .select('export_preset_id')
      .eq('id', projectId)
      .single();

    if (project && project.export_preset_id) {
      const { data: presetData } = await supabase
        .from('export_presets')
        .select('*')
        .eq('id', project.export_preset_id)
        .single();
        
      if (presetData) {
        presetSnapshot = {
          ...presetSnapshot,
          quality: presetData.quality || "Standard",
          ...presetData
        };
      }
    }

    // Insert into render_jobs using admin client
    const { data: job, error: insertError } = await supabaseAdmin
      .from('render_jobs')
      .insert({
        project_id: projectId,
        status: RENDER_JOB_STATUS.PENDING,
        progress: 0,
        timeline_snapshot: validatedTimeline,
        preset_snapshot: presetSnapshot,
        output_url: null,
        error_message: null,
        retry_count: 0
      })
      .select('id, status')
      .single()

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        // D.1 Graceful Race Handling: The index unique_active_render_job threw. Let's fetch the winning job.
        const { data: winningJob } = await supabase
          .from('render_jobs')
          .select('id, status')
          .eq('project_id', projectId)
          .in('status', activeStatuses)
          .limit(1)
        
        if (winningJob && winningJob.length > 0) {
          return NextResponse.json({
            jobId: winningJob[0].id,
            status: winningJob[0].status,
            message: "Returned existing active job after race condition"
          })
        }
      }
      console.error("Render Job Insert Error:", insertError)
      return NextResponse.json({ error: "Failed to create render job" }, { status: 500 })
    }

    if (!job) {
      return NextResponse.json({ error: "Failed to create render job, no data returned" }, { status: 500 })
    }

    try {
      const { WalletEngine } = await import("@/utils/billing/WalletEngine");
      const { BillingEngine } = await import("@/utils/billing/BillingEngine");
      
      // Get user from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Calculate Cost
        const codec = validatedTimeline.preset.codec || "h264";
        const chargeInfo = await BillingEngine.calculateCost("Render", "render_worker", codec);
        
        // Only reserve credits here. The Worker will handle Commit/Release based on final state.
        const reserveResult = await WalletEngine.reserveCredits(
          { userId: user.id, projectId: projectId, feature: "Render" },
          chargeInfo,
          "render_jobs",
          job.id
        );
        
        if (!reserveResult.success) {
            // Delete the job if billing reserve failed
            await supabaseAdmin.from('render_jobs').delete().eq("id", job.id);
            return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
        }
        
        console.log(`[BILLING] Render Job requested and credits reserved successfully. Job ID: ${job.id}`);
      }
    } catch (billingErr: any) {
      // If billing fails, delete the job
      await supabaseAdmin.from('render_jobs').delete().eq("id", job.id);
      return NextResponse.json({ error: billingErr.message || "Insufficient credits" }, { status: 402 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status
    })

  } catch (error: any) {
    console.error("POST /api/render error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
