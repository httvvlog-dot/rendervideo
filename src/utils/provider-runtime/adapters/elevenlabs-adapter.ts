import { ProviderAdapter } from "../types"

export interface ElevenLabsArgs {
  text: string
  voiceId?: string
}

export class ElevenLabsAdapter implements ProviderAdapter<ElevenLabsArgs, ArrayBuffer> {
  async execute(credential: any, args: ElevenLabsArgs): Promise<ArrayBuffer> {
    const apiKey = credential.encrypted_key;
    if (!apiKey) {
      throw new Error("ElevenLabsAdapter: API key is missing in credential");
    }

    const config = credential.config_json || {};
    const voiceId = args.voiceId || config.default_voice_id;

    if (!voiceId) {
      throw new Error("ElevenLabsAdapter: Voice ID not provided in args or credential config");
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
        model_id: config.default_model_id || "eleven_monolingual_v1",
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
