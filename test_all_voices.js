const fetch = require('node-fetch');

async function testAll() {
  const apiKey = "39d628eb975317b6dc1286cf2377c7cc"; // From DB dump earlier
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": apiKey } });
  const data = await res.json();
  
  if (!data.voices) {
    console.log("Failed to fetch voices", data);
    return;
  }
  
  console.log(`Found ${data.voices.length} voices. Testing them...`);
  
  for (const voice of data.voices) {
    console.log(`Testing voice: ${voice.name} (${voice.voice_id}) - Category: ${voice.category}`);
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey, "Accept": "audio/mpeg" },
      body: JSON.stringify({ text: "Test", model_id: "eleven_multilingual_v2" })
    });
    
    if (ttsRes.ok) {
      console.log(`SUCCESS! Voice ${voice.name} (${voice.voice_id}) works for Free Tier API!`);
      return;
    } else {
      const err = await ttsRes.text();
      console.log(`Failed: ${err}`);
    }
  }
}
testAll();
