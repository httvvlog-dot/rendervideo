import { FFmpegAdapter } from "../utils/render/ffmpeg";
import { TimelineJSON } from "../utils/render/core";

// Mock public image URLs for testing
const MOCK_IMAGE_1 = "https://picsum.photos/id/1018/1080/1920";
const MOCK_IMAGE_2 = "https://picsum.photos/id/1015/1080/1920";
const MOCK_IMAGE_3 = "https://picsum.photos/id/1019/1080/1920";

const mockTimeline: TimelineJSON = {
  version: 1,
  projectId: "test-project",
  timelineVersion: 1,
  totalDurationMs: 15000,
  preset: {
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    fps: 30,
    codec: "libx264"
  },
  scenes: [
    {
      id: "scene-1",
      sectionId: null,
      mediaId: "media-1",
      sourceUrl: MOCK_IMAGE_1,
      startTimeMs: 0,
      endTimeMs: 5000,
      durationMs: 5000,
      transition: { type: "none", durationMs: 0 },
      transform: { startScale: 1, endScale: 1, startX: 0, endX: 0, startY: 0, endY: 0, opacity: 1 }
    },
    {
      id: "scene-2",
      sectionId: null,
      mediaId: "media-2",
      sourceUrl: MOCK_IMAGE_2,
      startTimeMs: 5000,
      endTimeMs: 10000,
      durationMs: 5000,
      transition: { type: "none", durationMs: 0 },
      transform: { startScale: 1, endScale: 1, startX: 0, endX: 0, startY: 0, endY: 0, opacity: 1 }
    },
    {
      id: "scene-3",
      sectionId: null,
      mediaId: "media-3",
      sourceUrl: MOCK_IMAGE_3,
      startTimeMs: 10000,
      endTimeMs: 15000,
      durationMs: 5000,
      transition: { type: "none", durationMs: 0 },
      transform: { startScale: 1, endScale: 1, startX: 0, endX: 0, startY: 0, endY: 0, opacity: 1 }
    }
  ]
};

async function runTest() {
  const adapter = new FFmpegAdapter();
  
  console.log("Preparing render...");
  await adapter.prepare("test-job-123", mockTimeline);
  
  console.log("Rendering...");
  const output = await adapter.render(async (progress) => {
    console.log(`Progress: ${progress.toFixed(2)}%`);
  });
  
  console.log(`Render complete! Output saved to: ${output}`);
}

runTest().catch(console.error);
