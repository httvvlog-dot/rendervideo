import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkLogs() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: logs, error } = await supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(10);
  console.log('Error logs:', logs);
  if (error) console.error("Query Error:", error);
}

checkLogs().catch(console.error);
