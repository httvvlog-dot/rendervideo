import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envFile = fs.readFileSync(path.resolve('d:/A/TaoVideo/.env.local'), 'utf-8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']!;
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: creds, error } = await supabase
    .from('provider_credentials')
    .select('*, provider:providers(provider_key)')
    .eq('provider_id', '4c675cfb-264f-4d1d-9ebd-31c4b760ae2e');
    
  if (creds && creds.length > 0) {
    const c = creds[0];
    const apiKey = c.config_json?.apiKey || c.config_json?.api_key || '';
    
    console.log('--- CREDENTIAL RECORD ---');
    console.log('credential_id:', c.id);
    console.log('credential_name:', c.credential_name);
    console.log('config_json keys:', Object.keys(c.config_json || {}));
    console.log('apiKey exists:', !!apiKey);
    
    if (apiKey) {
      console.log('apiKey length:', apiKey.length);
      console.log('first char code:', apiKey.charCodeAt(0));
      console.log('last char code:', apiKey.charCodeAt(apiKey.length - 1));
      
      let hasNonAscii = false;
      let hasWhitespaceEdge = apiKey.trim() !== apiKey;
      let hasBullet = false;
      
      console.log('\n--- CHARACTER MAP (No keys) ---');
      for (let i = 0; i < apiKey.length; i++) {
        const code = apiKey.charCodeAt(i);
        if (code > 127) hasNonAscii = true;
        if (code === 8226) hasBullet = true;
        
        let type = 'ASCII';
        if (code === 8226) type = 'U+2022 BULLET';
        else if (code === 8203) type = 'U+200B ZERO WIDTH SPACE';
        else if (code === 65279) type = 'U+FEFF BOM';
        else if (code > 127) type = 'NON-ASCII';
        
        if (type !== 'ASCII' || i === 0 || i === apiKey.length - 1) {
            console.log(`position ${i}: code ${code} (${type})`);
        }
      }
      
      console.log('\n--- SUMMARY ---');
      console.log('hasNonAscii:', hasNonAscii);
      console.log('hasWhitespaceEdge:', hasWhitespaceEdge);
      console.log('hasBullet:', hasBullet);
      
      if (apiKey.charCodeAt(0) === 8226) {
        console.log('CONFIRMED: DATABASE VALUE STARTS WITH BULLET U+2022');
      }
    }
  } else {
    console.log('No ElevenLabs credential found');
  }
}
check();
