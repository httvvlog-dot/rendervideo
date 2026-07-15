import { generateMissingProjectVoice } from "./src/app/(user)/projects/[id]/voice-actions"
import { syncTimelineToVoice } from "./src/app/(user)/projects/[id]/timeline-actions"
import dotenv from "dotenv"

dotenv.config({ path: ".env.worker" })

// Removed

async function run() {
  const projectId = '4e3f9bcf-9bd1-4507-90ff-ba3c92204794'
  console.log("Generating voice for project:", projectId)
  const res = await generateMissingProjectVoice(projectId)
  console.log("Voice generation result:", JSON.stringify(res, null, 2))
}
run().catch(console.error)
