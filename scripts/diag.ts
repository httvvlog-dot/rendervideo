import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQueries() {
  console.log('--- 4 & 5. SELECT * FROM ai_capabilities ---');
  let res = await supabase.from('ai_capabilities').select('*');
  console.log(res.data);

  console.log('\n--- 8. COUNT(*) ---');
  let c1 = await supabase.from('ai_capabilities').select('id', { count: 'exact', head: true });
  console.log('ai_capabilities:', c1.count);
  let c2 = await supabase.from('provider_model_pricing').select('id', { count: 'exact', head: true });
  console.log('provider_model_pricing:', c2.count);
  let c3 = await supabase.from('credit_rules').select('id', { count: 'exact', head: true });
  console.log('credit_rules:', c3.count);

  console.log('\n--- 9. Raw data check ---');
  let raw = await supabase.from('ai_capabilities').select('feature, provider, model, is_active, is_default, priority');
  console.log(raw.data);
}

runQueries();
