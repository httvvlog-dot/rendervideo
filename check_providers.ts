import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkProviders() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: provider } = await supabase.from('providers').select('id, provider_key').eq('provider_key', 'openrouter').single();
  console.log('Provider:', provider);
  if (provider) {
    const { data: creds } = await supabase.from('provider_credentials').select('config_json, is_active').eq('provider_id', provider.id);
    console.log('Credentials:', creds);
  }
}

checkProviders().catch(console.error);
