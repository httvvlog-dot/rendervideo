import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSecrets() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: providers, error: pErr } = await supabase.from('providers').select('*');
  console.log('Providers Error:', pErr);

  const { data: secrets, error: sErr } = await supabase.from('encrypted_secrets').select('*');
  console.log('Secrets Error:', sErr);
  console.log('Secrets:', secrets?.map((s: any) => ({ name: s.name, config: s.config_json })));
}

checkSecrets().catch(console.error);
