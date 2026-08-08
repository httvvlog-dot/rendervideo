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
  const { data: creds, error } = await supabase.from('provider_credentials').select('*, provider:providers(provider_key)').eq('provider_id', '4c675cfb-264f-4d1d-9ebd-31c4b760ae2e');
  if (creds && creds.length > 0) {
    const c = creds[0];
    console.log(JSON.stringify({
      id: c.id,
      name: c.credential_name,
      health_status: c.health_status,
      runtime_status: c.runtime_status,
      credential_status: c.credential_status,
      last_success_at: c.last_success_at,
      last_failure_at: c.last_failure_at,
      last_error: c.last_error,
      latency: c.latency,
      priority: c.priority,
      updated_at: c.updated_at
    }, null, 2));
  }
}
check();
