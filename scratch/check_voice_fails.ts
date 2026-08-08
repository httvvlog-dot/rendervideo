import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']!;
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

import crypto from "crypto";

process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  const { data: creds, error } = await supabase
    .from('provider_credentials')
    .select('*, provider:providers(provider_key)')
    .eq('provider.provider_key', 'elevenlabs');
  if (creds && creds.length > 0) {
    const c = creds[0];
    console.log("ElevenLabs Credential:");
    console.log("created_at:", c.created_at);
    console.log("updated_at:", c.updated_at);
    console.log("health_status:", c.health_status);
    console.log("last_health_check_at:", c.last_health_check_at);
    console.log("credential_name:", c.credential_name);
    console.log("provider_id:", c.provider_id);
    
    const config = c.config_json || {};
    console.log("config_json KEYS ONLY:", Object.keys(config));
    
    const keyVal = config.apiKey;
    let classification = "unknown";
    if (!keyVal) classification = "empty";
    else if (keyVal.startsWith("sk_")) classification = "secret API key";
    else if (keyVal.length === 64 && /^[0-9a-f]+$/i.test(keyVal)) classification = "key_id";
    else classification = "unknown";
    
    console.log("API Key Classification:", classification);
    if (keyVal) {
       console.log("Length:", keyVal.length);
       console.log("Prefix:", keyVal.substring(0, 3));
    }
  } else {
    console.log("No ElevenLabs credentials found");
  }
}
check().catch(console.error);
