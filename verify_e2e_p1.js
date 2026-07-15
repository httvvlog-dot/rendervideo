require('dotenv').config({ path: '.env.worker' });
const { createClient } = require('@supabase/supabase-js');
const { compileTimeline } = require('./src/utils/render/compile-timeline');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://loeoprxsabbqlhouhrgm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runPhase1And2() {
  const projectId = '4e3f9bcf-9bd1-4507-90ff-ba3c92204794';
  console.log("=== PHASE 1 ===");
  
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  const scriptId = project.active_script_id;
  
  const { data: sections } = await supabase.from('script_sections').select('*').eq('script_id', scriptId);
  const { data: media } = await supabase.from('project_media').select('*').eq('project_id', projectId);
  const { data: scenes } = await supabase.from('project_scenes').select('*').eq('project_id', projectId);
  
  const images = media.filter(m => m.asset_type === 'image');
  const voices = media.filter(m => m.asset_type === 'voice');
  
  console.log("1. project_id:", projectId);
  console.log("2. active_script_id:", scriptId);
  console.log("3. sections:", sections.length);
  console.log("4. image media:", images.length);
  console.log("5. voice media:", voices.length);
  console.log("6. project_scenes:", scenes.length);
  
  let validSections = true;
  for (const s of sections) {
     const hasVoiceId = !!s.voice_media_id;
     console.log(`Section ${s.id}: voice_media_id=${hasVoiceId}, voice_duration_ms=${s.voice_duration_ms}`);
     if (!hasVoiceId) validSections = false;
  }
  
  console.log("All URLs reachable check skipped (assuming R2 works).");

  console.log("\n=== PHASE 2 ===");
  const timelineJSON = await compileTimeline(supabase, projectId);
  console.log("1. totalDurationMs:", timelineJSON.totalDurationMs);
  console.log("2. scene count:", timelineJSON.scenes.length);
  console.log("3. audioTracks count:", timelineJSON.audioTracks?.length || 0);
  
  if (timelineJSON.audioTracks) {
    for (let i = 0; i < timelineJSON.audioTracks.length; i++) {
       const track = timelineJSON.audioTracks[i];
       console.log(`Audio Track ${i}: start=${track.startTimeMs}, dur=${track.durationMs}, url=${track.sourceUrl.substring(0,30)}...`);
    }
  }
}

runPhase1And2().catch(console.error);
