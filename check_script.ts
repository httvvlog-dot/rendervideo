import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkScript() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: script } = await supabase.from('scripts').select('*').eq('id', 'a9602644-5807-4ced-932d-abbd1850b5f3').single();
  console.log('Script Length:', script?.content?.length);
  console.log('Word count:', script?.word_count);
  
  const { data: sections } = await supabase.from('script_sections').select('section_index, narration, visual_description').eq('script_id', script.id).order('section_index', { ascending: true });
  console.log('Sections:', sections?.map(s => `Sec ${s.section_index}: [${s.narration?.length} chars] ${s.narration.substring(0, 50)}... Visual: ${s.visual_description.substring(0, 40)}...`));
}

checkScript().catch(console.error);
