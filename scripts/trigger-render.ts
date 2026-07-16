import { createClient } from "@supabase/supabase-js"
import { compileTimeline } from "../src/utils/render/compile-timeline"
import { RENDER_JOB_STATUS } from "../src/utils/render/core"
import dotenv from "dotenv"

dotenv.config({ path: ".env.worker" })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const projectId = "1f4ed744-5295-480a-b126-1ff10ee798e5"

async function run() {
  console.log("Triggering job for project", projectId)
  const timeline = await compileTimeline(supabase, projectId, true)
  
  const { data: job, error } = await supabase
    .from('render_jobs')
    .insert({
      project_id: projectId,
      status: RENDER_JOB_STATUS.QUEUED,
      progress: 0,
      timeline_snapshot: timeline,
      output_url: null,
      error_message: null,
      retry_count: 0
    })
    .select('id, status')
    .single()
    
  if (error) {
    if (error.code === '23505') {
       console.log("Job already exists, deleting and trying again...")
       await supabase.from('render_jobs').delete().eq('project_id', projectId)
       return run()
    }
    console.error("Failed", error)
  } else {
    console.log("Job queued successfully:", job)
  }
}

run()
