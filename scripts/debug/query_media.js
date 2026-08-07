import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data } = await supabase.from('project_media').select('id, file_name, created_at, asset_type, public_url').eq('section_id', 'baccb252-1e28-4922-9a7a-670cf76dc66c').order('created_at', { ascending: true });
  console.log(data);
}

run();
