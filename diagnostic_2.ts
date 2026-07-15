import fs from "fs"
import crypto from "crypto"
import { execSync } from "child_process"
import dotenv from "dotenv"

dotenv.config({ path: ".env.worker" })

function getSha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

async function run() {
  console.log("=== CHECK 6: WORKER DOWNLOAD ===")
  const mediaUrls = [
    "https://pub-6a4b725013fd477abb67e9c32523e300.r2.dev/projects/4e3f9bcf-9bd1-4507-90ff-ba3c92204794/media/voice_4e3f9bcf-9bd1-4507-90ff-ba3c92204794_section_1_1784090396124.mp3",
    "https://pub-6a4b725013fd477abb67e9c32523e300.r2.dev/projects/4e3f9bcf-9bd1-4507-90ff-ba3c92204794/media/voice_4e3f9bcf-9bd1-4507-90ff-ba3c92204794_section_2_1784090402714.mp3",
    "https://pub-6a4b725013fd477abb67e9c32523e300.r2.dev/projects/4e3f9bcf-9bd1-4507-90ff-ba3c92204794/media/voice_4e3f9bcf-9bd1-4507-90ff-ba3c92204794_section_3_1784090409127.mp3"
  ]
  const files = ["worker_audio_1.mp3", "worker_audio_2.mp3", "worker_audio_3.mp3"]

  for (let i = 0; i < mediaUrls.length; i++) {
    const res = await fetch(mediaUrls[i])
    const r2Buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(files[i], r2Buffer)
    console.log(`${files[i]}: Size=${r2Buffer.length}, SHA256=${getSha256(r2Buffer)}`)
    try {
      execSync(`D:\\A\\TaoVideo\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe -v error -i ${files[i]} -f null -`, { stdio: 'pipe' })
      console.log(`Decode test ${files[i]}: OK`)
    } catch (e: any) {
      console.log(`Decode test ${files[i]}: FAILED - ${e.stderr?.toString()}`)
    }
  }

  const ffmpegExe = "D:\\A\\TaoVideo\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe"

  console.log("\n=== CHECK 7: AUDIO-ONLY DIAGNOSTICS ===")
  // Test A - Direct Transcode
  execSync(`${ffmpegExe} -y -i worker_audio_1.mp3 -c:a aac -b:a 192k debug_01_direct_voice.m4a`, { stdio: 'inherit' })
  console.log("Test A complete")

  // Test B - Sequence Without anullsrc (Using concat)
  execSync(`${ffmpegExe} -y -i worker_audio_1.mp3 -i worker_audio_2.mp3 -i worker_audio_3.mp3 -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[outa]" -map "[outa]" -c:a aac -b:a 192k debug_02_voice_only.m4a`, { stdio: 'inherit' })
  console.log("Test B complete")

  // Test C & D - Exact Production Mix
  // Production delays from job: audio1: 0ms, audio2: 6687ms, audio3: 12382ms. Total duration ~ 18.599s.
  const amixFilter = `[4:a]aformat=channel_layouts=stereo:sample_rates=44100,adelay=0|0[a0]; [5:a]aformat=channel_layouts=stereo:sample_rates=44100,adelay=6687|6687[a1]; [6:a]aformat=channel_layouts=stereo:sample_rates=44100,adelay=12382|12382[a2]; [3:a][a0][a1][a2]amix=inputs=4:duration=first:dropout_transition=0,volume=4.0[outa]`
  
  execSync(`${ffmpegExe} -y -f lavfi -t 18.599 -i anullsrc=channel_layout=stereo:sample_rate=44100 -i worker_audio_1.mp3 -i worker_audio_2.mp3 -i worker_audio_3.mp3 -i worker_audio_1.mp3 -i worker_audio_2.mp3 -i worker_audio_3.mp3 -filter_complex "${amixFilter}" -map "[outa]" -c:a aac -b:a 192k debug_04_current_production_mix.m4a`, { stdio: 'inherit' })
  console.log("Test D complete")

  // CHECK 9 - FFmpeg Version
  console.log("\n=== CHECK 9: FFmpeg Version ===")
  const versionInfo = execSync(`${ffmpegExe} -version`).toString()
  console.log(versionInfo.split('\n')[0])

}

run().catch(console.error)
