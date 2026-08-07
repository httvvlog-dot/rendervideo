import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function getProjectSchema() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: p } = await supabase.from('projects').select('*').limit(1).single();
  if (p) {
    console.log(Object.keys(p));
  } else {
    console.log("No projects found, trying without single");
    const { data: p2 } = await supabase.from('projects').select('*').limit(1);
    if (p2 && p2.length > 0) console.log(Object.keys(p2[0]));
    else console.log("Still no projects");
  }
}

getProjectSchema().catch(console.error);
