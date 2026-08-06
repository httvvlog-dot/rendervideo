import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runPageLogic() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const id = 'f95f4978-7f7d-4700-967e-369e199af3cc';
  const userId = '1d159c39-8939-4668-b019-e9d8778c05a7'; // Hardcode xuananh0190@gmail.com

  console.log("Fetching profile...");
  const { data: profile, error: err1 } = await supabase
    .from('profiles')
    .select('default_voice_preset_id')
    .eq('id', userId)
    .single();
  console.log("profile err:", err1);

  console.log("Fetching activeVoices...");
  const { data: activeVoices, error: err2 } = await supabase
    .from('voice_presets')
    .select('id, display_name, description, category, preview_url, voice_id')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  console.log("activeVoices err:", err2);

  console.log("Fetching project...");
  const { data: project, error: err3 } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  console.log("project err:", err3);

  if (!project) throw new Error("notFound()");

  console.log("Fetching scripts...");
  const { data: scripts, error: err4 } = await supabase
    .from('scripts')
    .select('*')
    .eq('project_id', id)
    .order('version', { ascending: true });
  console.log("scripts err:", err4);

  console.log("Fetching scenes...");
  const { data: scenes, error: err5 } = await supabase
    .from('project_scenes')
    .select('*')
    .eq('project_id', id)
    .order('sort_order', { ascending: true });
  console.log("scenes err:", err5);

  console.log("Fetching projectMediaRaw...");
  const { data: projectMediaRaw, error: err6 } = await supabase
    .from('project_media')
    .select('*')
    .eq('project_id', id)
    .in('asset_type', ['image', 'voice'])
    .order('created_at', { ascending: false });
  console.log("media err:", err6);

  console.log("Fetching exportPresets...");
  const { data: exportPresets, error: err7 } = await supabase
    .from('export_presets')
    .select('*')
    .order('display_order', { ascending: true });
  console.log("presets err:", err7);

  const activeScript = scripts?.find(s => s.id === project.active_script_id);
  
  let activeSections: any[] = [];
  if (activeScript) {
    console.log("Fetching sections...");
    const { data: fetchedSections, error: err8 } = await supabase
      .from('script_sections')
      .select('*')
      .eq('script_id', activeScript.id)
      .order('section_index', { ascending: true });
    console.log("sections err:", err8);
    activeSections = fetchedSections || [];
  }
  
  console.log("ALL DATA FETCHED SAFELY.");
}

runPageLogic().catch(console.error);
