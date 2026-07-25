import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQueries() {
  console.log('--- ai_capabilities ---');
  let res1 = await supabase
    .from('ai_capabilities')
    .select('feature, provider, model, is_active, is_default, priority')
    .order('feature')
    .order('priority', { ascending: false });
  console.log(res1.data);

  console.log('\n--- provider_model_pricing ---');
  let res2 = await supabase
    .from('provider_model_pricing')
    .select('provider, model, version');
  console.log(res2.data);
}

runQueries();
