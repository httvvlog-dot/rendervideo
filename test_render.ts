import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.worker' });
import { createClient } from '@supabase/supabase-js';
import { FFmpegAdapter } from './src/utils/render/ffmpeg';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: job } = await supabase.from('render_jobs').select('*').eq('id', '51c8f373-7ce9-4760-b7ef-acfadc00df44').single();
  let timeline = job.timeline_snapshot;
  while (typeof timeline === 'string') {
    timeline = JSON.parse(timeline);
  }
  
  const adapter = new FFmpegAdapter();
  await adapter.prepare(job.id, timeline);
  const localPath = await adapter.render(async (progress) => {
    console.log('Progress:', progress);
  });
  console.log('SUCCESS:', localPath);
}
run().catch(err => console.error(err));
