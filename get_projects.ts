import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function getProjects() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data } = await supabase.from('projects').select('id, title, created_at, active_script_id').eq('user_id', '1d159c39-8939-4668-b019-e9d8778c05a7').order('created_at', { ascending: false }).limit(3);
  console.log(data);
}

getProjects().catch(console.error);
