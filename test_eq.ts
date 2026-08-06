import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testEq() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  try {
    const { data, error } = await supabase.from('profiles').select('id').eq('id', undefined).single();
    console.log("Data:", data, "Error:", error);
  } catch (e: any) {
    console.error("Caught Exception:", e.message);
  }
}

testEq().catch(console.error);
