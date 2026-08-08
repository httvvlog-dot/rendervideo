import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
async function check() {
  const { data, error } = await supabase.from('provider_credentials').update({
    last_checked_at: new Date().toISOString()
  }).eq('provider_id', '4c675cfb-264f-4d1d-9ebd-31c4b760ae2e').select();
  console.log('Update Error:', error);
  console.log('Update Data:', data);
}
check();
