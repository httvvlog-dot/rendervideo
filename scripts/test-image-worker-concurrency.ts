import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { fork } from 'child_process';
import path from 'path';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const USER_ID = process.env.TEST_USER_ID || '50f048a6-15e7-4886-925b-32230b78700b';

async function seedJobs(count: number) {
  console.log(`Seeding ${count} mock jobs...`);
  const jobs = [];
  for (let i = 0; i < count; i++) {
    jobs.push({
      user_id: USER_ID,
      status: 'PENDING',
      num_images: 1,
      original_prompt: `Mock Job ${i}`,
      provider: 'mock',
      project_id: null
    });
  }
  const { error } = await supabase.from('image_jobs').insert(jobs);
  if (error) throw new Error(`Seed error: ${error.message}`);
}

async function main() {
  process.env.IMAGE_PROVIDER_MODE = 'mock';
  
  await seedJobs(100);
  console.log('Jobs seeded. Spawning 10 workers...');
  
  const workers: any[] = [];
  for (let i = 0; i < 10; i++) {
    const worker = fork(path.resolve(__dirname, '../node_modules/tsx/dist/cli.mjs'), [path.resolve(__dirname, '../src/worker/image-worker.ts')], {
      env: { ...process.env, IMAGE_PROVIDER_MODE: 'mock' }
    });
    workers.push(worker);
  }
  
  console.log('Workers running. Please monitor DB or logs. Press Ctrl+C to stop.');
}

main().catch(console.error);
