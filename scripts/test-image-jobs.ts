import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const USER_ID = process.env.TEST_USER_ID || '50f048a6-15e7-4886-925b-32230b78700b';

async function runTest(name: string, payload: any) {
  console.log('Running ' + name + '...');
  const { data, error } = await supabase
    .from('image_jobs')
    .insert({
      user_id: USER_ID,
      status: 'PENDING',
      ...payload
    })
    .select()
    .single();

  if (error) console.error('Failed ' + name + ':', error.message);
  else console.log('Created job ' + data.id + ' for ' + name);
}

async function main() {
  await runTest('CASE 1', { num_images: 1, original_prompt: 'A beautiful portrait', character_ref_url: 'char1.jpg', garment_ref_url: 'garment1.jpg', background_ref_url: 'bg1.jpg' });
  console.log('All test cases seeded.');
}

main().catch(console.error);
