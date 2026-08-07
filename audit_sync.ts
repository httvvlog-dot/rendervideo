import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.worker" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runAudit() {
  const projectId = "a7369e89-c4f1-4a09-b4cb-713e860c8e0d" // project from the previous log
  
  console.log("=== TIMELINE SYNC AUDIT ===")
  console.log(`Project ID: ${projectId}`)
  
  // 1. Check Project and Script
  const { data: project } = await supabase
    .from("projects")
    .select("id, active_script_id")
    .eq("id", projectId)
    .single()
    
  if (!project || !project.active_script_id) {
    console.log("❌ Project or active_script_id not found")
    return
  }
  
  console.log(`Active Script ID: ${project.active_script_id}`)
  
  // 2. Fetch Sections
  const { data: sections } = await supabase
    .from("script_sections")
    .select("id, section_index, voice_media_id, voice_duration_ms")
    .eq("script_id", project.active_script_id)
    .order("section_index", { ascending: true })
    
  console.log(`\nSections found: ${sections?.length || 0}`)
  
  // 3. Fetch Voice Assets
  const { data: audioAssets } = await supabase
    .from("audio_assets")
    .select("id, section_id, duration_ms, storage_key")
    .eq("project_id", projectId)
    .eq("audio_type", "voice")
    
  console.log(`Voice assets found: ${audioAssets?.length || 0}\n`)
  
  if (!sections) return
  
  let totalFailed = 0
  let totalSuccess = 0
  
  for (const section of sections) {
    console.log(`------------`)
    console.log(`Section ${section.section_index}`)
    console.log(`ID: ${section.id}`)
    console.log(`voice_media_id = ${section.voice_media_id || "NULL"}`)
    console.log(`voice_duration_ms before update = ${section.voice_duration_ms || "NULL"}`)
    
    // Check audio_assets record
    let foundAudio = null
    if (section.voice_media_id) {
      foundAudio = audioAssets?.find(a => a.id === section.voice_media_id)
      console.log(`audio_assets record exist? ${foundAudio ? "YES" : "NO"}`)
    } else {
      // By section_id fallback
      foundAudio = audioAssets?.find(a => a.section_id === section.id)
      console.log(`audio_assets record exist by section_id? ${foundAudio ? "YES" : "NO"}`)
    }
    
    if (foundAudio) {
      console.log(`duration_ms = ${foundAudio.duration_ms || "NULL"}`)
      if (foundAudio.duration_ms) {
        console.log(`Database update result = WOULD SUCCEED (voice_duration_ms = ${foundAudio.duration_ms / 1000.0})`)
        console.log(`Status: SUCCESS`)
        totalSuccess++
      } else {
        console.log(`Database update result = WOULD FAIL`)
        console.log(`Exact failure reason: Duration missing (NULL duration_ms)`)
        console.log(`Status: FAILED`)
        totalFailed++
      }
    } else {
      console.log(`duration_ms = NULL`)
      console.log(`Database update result = WOULD FAIL`)
      console.log(`Exact failure reason: Voice not found in audio_assets`)
      console.log(`Status: FAILED`)
      totalFailed++
    }
  }
  
  console.log(`\n=== FINAL SUMMARY ===`)
  console.log(`Total Sections: ${sections.length}`)
  console.log(`Total Success: ${totalSuccess}`)
  console.log(`Total Failed: ${totalFailed}`)
  console.log(`Why all failed: ${totalFailed === sections.length ? (audioAssets?.length === 0 ? "No voice assets have been successfully generated for this project yet (likely due to the previous Voice Generation failure)." : "Existing voice assets are disconnected or missing duration.") : "N/A"}`)
}

runAudit().catch(console.error)
