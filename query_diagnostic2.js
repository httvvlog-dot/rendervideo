import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const projectId = 'f95f4978-7f7d-4700-967e-369e199af3cc';
  
  console.log("=== A. IDENTIFY EXACT TEST ===");
  const { data: scripts } = await supabase.from('scripts').select('id').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1);
  const scriptId = scripts?.[0]?.id;
  console.log("Active script_id:", scriptId);
  
  // Section 1
  const { data: sections } = await supabase.from('script_sections').select('*').eq('script_id', scriptId).order('section_index', { ascending: true }).limit(1);
  const section1 = sections?.[0];
  console.log("Section 1 ID:", section1?.id);
  
  // Latest media
  const { data: media } = await supabase.from('project_media').select('*').eq('project_id', projectId).eq('section_id', section1?.id).order('created_at', { ascending: false }).limit(2);
  console.log("Latest Media for Section 1:", media);

  // User
  const { data: project } = await supabase.from('projects').select('user_id').eq('id', projectId).single();
  const userId = project?.user_id;

  const { data: txs } = await supabase.from('wallet_transactions').select('*').eq('user_id', userId).eq('feature', 'IMAGE_GENERATION').order('created_at', { ascending: false }).limit(2);
  console.log("Latest Image TX:", txs);

  const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
  console.log("\n=== I. CURRENT WALLET STATE ===");
  console.log("balance_credits:", wallet?.balance_credits);
  console.log("reserved_credits:", wallet?.reserved_credits);
  
  console.log("\n=== B. SECTION 1 CONTENT AUDIT ===");
  if (section1) {
    console.log("title:", section1.title);
    console.log("narration:", section1.narration);
    console.log("visual_description:", section1.visual_description);
    console.log("image_prompt:", section1.image_prompt);
    console.log("duration_seconds:", section1.duration_seconds);
  }
}

run();
