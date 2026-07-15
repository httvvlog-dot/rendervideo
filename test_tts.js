const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://loeoprxsabbqlhouhrgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZW9wcnhzYWJicWxob3VocmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI5MTk3MiwiZXhwIjoyMDk3ODY3OTcyfQ.e9yBCAbuip_IHgob6mnwywUI1obiHUqZDHwV8wsMwoY'
);

async function testTTS() {
  const { data: creds } = await supabase.from('provider_credentials').select('*').eq('id', 'acd29a2c-9f6e-447b-b478-51759261db78').single();
  const apiKey = creds.config_json.apiKey;
  const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      "Accept": "audio/mpeg"
    },
    body: JSON.stringify({
      text: "Xin chào bạn",
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    })
  });

  console.log('Status Rachel v2:', response.status);
  if (!response.ok) {
    const text = await response.text();
    console.log('Error Rachel v2:', text);
  } else {
    console.log('Rachel v2 SUCCESS');
  }

  // Test with another model
  const response3 = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      "Accept": "audio/mpeg"
    },
    body: JSON.stringify({
      text: "Xin chào bạn",
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.5 }
    })
  });

  console.log('Status Rachel turbo v2_5:', response3.status);
  if (!response3.ok) {
    const text = await response3.text();
    console.log('Error Rachel turbo:', text);
  }
}

testTTS();
