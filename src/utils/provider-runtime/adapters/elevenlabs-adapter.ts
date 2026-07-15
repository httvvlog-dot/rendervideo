import { ProviderAdapter } from "../types"

export interface ElevenLabsArgs {
  text: string
  voiceId?: string
}

export class ElevenLabsAdapter implements ProviderAdapter<ElevenLabsArgs, ArrayBuffer> {
  async execute(credential: any, args: ElevenLabsArgs): Promise<ArrayBuffer> {
    const config = credential.config_json || {};
    const apiKey = credential.encrypted_key || config.apiKey || config.api_key;
    if (!apiKey) {
      throw new Error("ElevenLabsAdapter: API key is missing in credential (neither encrypted_key nor config_json.apiKey found)");
    }

    const voiceId = args.voiceId || config.default_voice_id || config.defaultVoiceId || config.voice_id || config.voiceId;

    if (!voiceId) {
      throw new Error("ElevenLabsAdapter: Voice ID not provided in args or credential config (checked default_voice_id, defaultVoiceId, voice_id, voiceId)");
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: args.text,
        model_id: config.default_model_id || "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error("ElevenLabsAdapter: Received empty audio buffer");
    }
    
    return arrayBuffer;
  }
}
