import { createClient } from "@supabase/supabase-js"
import { ProviderRuntime } from "./src/utils/provider-runtime"
import { ElevenLabsAdapter } from "./src/utils/provider-runtime/adapters/elevenlabs-adapter"
import { CloudflareR2Adapter } from "./src/utils/provider-runtime/adapters/cloudflare-r2-adapter"
import fs from "fs"
import crypto from "crypto"
import { execSync } from "child_process"
import dotenv from "dotenv"

dotenv.config({ path: ".env.worker" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getSha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

async function run() {
  const projectId = '4e3f9bcf-9bd1-4507-90ff-ba3c92204794'
  const ttsRuntime = new ProviderRuntime("elevenlabs")
  const r2Runtime = new ProviderRuntime("cloudflare_r2")

  console.log("=== CHECK 1 & 2: ELEVENLABS RAW ===")
  const text = "Chào mừng bạn đến với video đầu tiên."
  console.log("Generating audio for text:", text)
  
  // Injecting an interceptor into fetch is hard without modifying global.fetch
  // But we know the adapter code. Let's just run it and get the raw ArrayBuffer.
  const rawArrayBuffer = await ttsRuntime.execute(new ElevenLabsAdapter(), {
    step: "VOICE",
    projectId: projectId,
    args: { text }
  })
  
  const rawBuffer = Buffer.from(rawArrayBuffer)
  fs.writeFileSync("debug_elevenlabs_raw.mp3", rawBuffer)
  console.log("Saved debug_elevenlabs_raw.mp3")
  console.log("Size:", rawBuffer.length)
  console.log("SHA256:", getSha256(rawBuffer))
  console.log("First 16 bytes:", rawBuffer.subarray(0, 16).toString('hex'))

  console.log("\n=== CHECK 3: R2 STORED OBJECT ===")
  // For the failed job a4657e8f-9ab1-4ff6-b244-372e87c41503, the source audio files are in project_media
  const mediaUrls = [
    "https://pub-6a4b725013fd477abb67e9c32523e300.r2.dev/projects/4e3f9bcf-9bd1-4507-90ff-ba3c92204794/media/voice_4e3f9bcf-9bd1-4507-90ff-ba3c92204794_section_1_1784090396124.mp3",
    "https://pub-6a4b725013fd477abb67e9c32523e300.r2.dev/projects/4e3f9bcf-9bd1-4507-90ff-ba3c92204794/media/voice_4e3f9bcf-9bd1-4507-90ff-ba3c92204794_section_2_1784090402714.mp3",
    "https://pub-6a4b725013fd477abb67e9c32523e300.r2.dev/projects/4e3f9bcf-9bd1-4507-90ff-ba3c92204794/media/voice_4e3f9bcf-9bd1-4507-90ff-ba3c92204794_section_3_1784090409127.mp3"
  ]

  for (let i = 0; i < mediaUrls.length; i++) {
    const res = await fetch(mediaUrls[i])
    const r2Buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(`debug_r2_voice_${i+1}.mp3`, r2Buffer)
    console.log(`R2 Voice ${i+1}: Size=${r2Buffer.length}, SHA256=${getSha256(r2Buffer)}`)
  }

  // To check if upload corrupts it, let's upload rawBuffer to a test key and download it
  console.log("\n=== CHECK 4 & 5: BYTE INTEGRITY HTTP HANDLING ===")
  const testObjectKey = `projects/${projectId}/media/test_diagnostic.mp3`
  await r2Runtime.execute(new CloudflareR2Adapter(), {
    step: "UPLOAD",
    projectId: projectId,
    args: { objectKey: testObjectKey, fileBuffer: rawBuffer, mimeType: "audio/mpeg", fileName: "test_diagnostic.mp3", projectId: projectId }
  })
  
  const testRes = await fetch(`https://pub-6a4b725013fd477abb67e9c32523e300.r2.dev/${testObjectKey}`)
  const testDownloadBuffer = Buffer.from(await testRes.arrayBuffer())
  console.log("R2 Test Download Size:", testDownloadBuffer.length)
  console.log("R2 Test Download SHA256:", getSha256(testDownloadBuffer))
  console.log("Hashes match?", getSha256(rawBuffer) === getSha256(testDownloadBuffer))

}

run().catch(console.error)
