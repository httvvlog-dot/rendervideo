const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY'
);

async function test() {
  const { data: creds } = await supabase.from('provider_credentials').select('*').eq('id', 'acd29a2c-9f6e-447b-b478-51759261db78').single();
  const apiKey = creds.config_json.apiKey;
  
  console.log('Key length:', apiKey.length);
  
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": apiKey } });
  console.log('Status:', res.status);
  
  const text = await res.text();
  console.log('Response body:', text);
}

test();
