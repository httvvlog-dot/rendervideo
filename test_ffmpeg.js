require('dotenv').config({ path: '.env.worker' });
const { createClient } = require('@supabase/supabase-js');
const { compileTimeline } = require('./src/utils/render/compile-timeline');
const { FFmpegAdapter } = require('./src/utils/render/ffmpeg');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY'
);

async function test() {
  try {
    const projectId = '4e3f9bcf-9bd1-4507-90ff-ba3c92204794';
    console.log("Compiling timeline...");
    const timeline = await compileTimeline(supabase, projectId);
    console.log("Timeline audio tracks:", timeline.audioTracks?.length || 0);
    
    const adapter = new FFmpegAdapter();
    console.log("Preparing...");
    await adapter.prepare('test-job-id', timeline);
    
    console.log("Rendering...");
    const outputPath = await adapter.render(async (p) => {
      console.log("Progress:", p.toFixed(1) + "%");
    });
    
    console.log("Render completed:", outputPath);
    
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
