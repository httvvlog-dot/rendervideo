import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  // 1. Get ElevenLabs API Key via DB (two_tier_providers or encrypted_secrets)
  // Instead of querying providers directly, let's just fetch it
  const { data: prov, error: provErr } = await supabase
    .from('encrypted_secrets')
    .select('secret_value')
    .eq('secret_name', 'elevenlabs_api_key')
    .single();

  let apiKey = prov?.secret_value;

  if (!apiKey) {
    console.log("Could not find in encrypted_secrets, falling back to providers table (if it exists)");
    // Try to get from providers table if it exists
    const { data: p2 } = await supabase.from('providers').select('encrypted_key').eq('provider_key', 'elevenlabs').single();
    apiKey = p2?.encrypted_key;
  }

  if (!apiKey) {
    throw new Error("Missing ElevenLabs API key");
  }

  console.log("Fetching models...");
  const resModels = await fetch('https://api.elevenlabs.io/v1/models', { headers: { 'xi-api-key': apiKey }});
  const models = await resModels.json();
  const multiModels = models.filter((m: any) => m.model_id.includes('multilingual') || m.model_id.includes('flash')).map((m:any) => m.model_id);
  console.log("Available suitable models:", multiModels);

  console.log("Fetching voices...");
  const resVoices = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': apiKey }});
  const voices = await resVoices.json();
  const altVoice = voices.voices.find((v:any) => v.voice_id !== 'P37gHF6iLTEvs2pLYhyv');
  console.log("Using Alternative Voice:", altVoice?.voice_id, altVoice?.name);

  const text = 'Xin chào, đây là bản kiểm tra giọng đọc tiếng Việt. Hôm nay trời rất đẹp. Chúng ta hãy cùng nhau bắt đầu một câu chuyện mới. Cảm ơn bạn đã lắng nghe.';

  const baseVoiceId = 'P37gHF6iLTEvs2pLYhyv';

  // Helper to generate
  async function generateTest(name: string, voiceId: string, modelId: string, stability: number, similarity: number, style: number, boost: boolean) {
    console.log(`\n--- RUNNING ${name} ---`);
    const reqBody = {
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarity,
        style,
        use_speaker_boost: boost
      }
    };
    
    console.log(`Voice ID: ${voiceId}`);
    console.log(`Model: ${modelId}`);
    console.log(`Settings:`, reqBody.voice_settings);

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify(reqBody)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`${name} FAILED: ${res.status} ${err}`);
      return null;
    }

    const arr = await res.arrayBuffer();
    const buf = Buffer.from(arr);
    fs.writeFileSync(`${name}.mp3`, buf);
    console.log(`Saved ${name}.mp3 (${buf.length} bytes)`);
    return buf;
  }

  // TEST A: Current production configuration
  await generateTest('test_A_current_production', baseVoiceId, 'eleven_multilingual_v2', 0.5, 0.5, 0.0, true);

  // TEST B: Neutral settings
  await generateTest('test_B_neutral_settings', baseVoiceId, 'eleven_multilingual_v2', 0.5, 0.75, 0.0, true);

  // TEST C: Alternative model (eleven_multilingual_v1 or v2.5 if available)
  const altModel = multiModels.find((m:string) => m === 'eleven_multilingual_v1') || multiModels[0];
  await generateTest('test_C_alternative_model', baseVoiceId, altModel, 0.5, 0.75, 0.0, true);

  // TEST D: Known-good alternative voice
  await generateTest('test_D_alternative_vietnamese_voice', altVoice.voice_id, 'eleven_multilingual_v2', 0.5, 0.75, 0.0, true);

  console.log("\nALL TESTS COMPLETED!");
}

run().catch(console.error);
