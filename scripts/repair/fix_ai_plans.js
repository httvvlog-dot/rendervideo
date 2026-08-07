require('dotenv').config({ path: '.env.worker' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.worker");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log("Fetching Flux Schnell model ID...");
    const { data: model, error: modelErr } = await supabase
        .from('ai_models')
        .select('id')
        .eq('api_slug', 'fal-ai/flux/schnell')
        .limit(1)
        .single();
        
    if (modelErr || !model) {
        console.error("Error fetching model:", modelErr);
        return;
    }
    
    console.log("Flux Schnell ID:", model.id);
    
    // Update PRO
    console.log("Updating PRO plan...");
    const { error: proErr } = await supabase
        .from('ai_plan_profiles')
        .update({ ai_model_id: model.id })
        .eq('capability', 'IMAGE_GENERATION')
        .eq('plan_key', 'PRO')
        .is('ai_model_id', null);
        
    if (proErr) console.error("PRO Update Error:", proErr);
    else console.log("PRO plan updated successfully.");
    
    // Update VIP
    console.log("Updating VIP plan...");
    const { error: vipErr } = await supabase
        .from('ai_plan_profiles')
        .update({ ai_model_id: model.id })
        .eq('capability', 'IMAGE_GENERATION')
        .eq('plan_key', 'VIP')
        .is('ai_model_id', null);
        
    if (vipErr) console.error("VIP Update Error:", vipErr);
    else console.log("VIP plan updated successfully.");
    
    // Verify
    console.log("\nVerifying updated mapping...");
    const { data: verifyData, error: verifyErr } = await supabase
        .from('ai_plan_profiles')
        .select(`
            plan_key,
            capability,
            ai_models ( display_name, api_slug, provider_id )
        `)
        .eq('capability', 'IMAGE_GENERATION');
        
    if (verifyErr) {
      console.error("Error verifying:", verifyErr);
    } else {
      console.log(JSON.stringify(verifyData, null, 2));
    }
  } catch (err) {
    console.error("Script exception:", err);
  }
}

main();
