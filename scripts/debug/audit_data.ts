import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function auditData() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const projectId = 'f95f4978-7f7d-4700-967e-369e199af3cc';
  
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
  console.log("PROJECT:");
  console.log("ID:", project.id);
  console.log("Title:", project.title);
  console.log("Active Script ID:", project.active_script_id);
  
  const { data: scripts } = await supabase.from('scripts').select('*').eq('project_id', projectId).order('version', { ascending: true });
  console.log("\nSCRIPTS:");
  for (const script of scripts || []) {
    console.log(`- Script ID: ${script.id}, Version: ${script.version}`);
  }
  
  if (!project.active_script_id) return;
  
  const { data: sections } = await supabase.from('script_sections').select('*').eq('script_id', project.active_script_id).order('section_index', { ascending: true });
  console.log("\nSECTIONS for Active Script:");
  for (const s of sections || []) {
    console.log(`[Section ${s.section_index}] ID: ${s.id}`);
    console.log(`  narration null?: ${s.narration === null ? 'YES' : 'NO'} (type: ${typeof s.narration})`);
    if (s.narration !== null) console.log(`  narration preview: "${s.narration.substring(0, 30)}..."`);
    console.log(`  visual_description null?: ${s.visual_description === null ? 'YES' : 'NO'}`);
    console.log(`  image_prompt null?: ${s.image_prompt === null ? 'YES' : 'NO'}`);
    console.log(`  duration_seconds null?: ${s.duration_seconds === null ? 'YES' : 'NO'} (value: ${s.duration_seconds})`);
    console.log(`  voice_duration_ms null?: ${s.voice_duration_ms === null ? 'YES' : 'NO'} (value: ${s.voice_duration_ms})`);
  }
}

auditData().catch(console.error);
