import { ProviderAdapter } from "../types"

export interface ElevenLabsArgs {
  text: string
  voiceId?: string
  modelId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

export class ElevenLabsAdapter implements ProviderAdapter<ElevenLabsArgs, ArrayBuffer> {
  async execute(credential: any, args: ElevenLabsArgs): Promise<ArrayBuffer> {
    const config = credential.config_json || {};
    const apiKey = credential.encrypted_key || config.apiKey || config.api_key;
    if (!apiKey) {
      throw new Error("ElevenLabsAdapter: API key is missing in credential (neither encrypted_key nor config_json.apiKey found)");
    }

    const effectiveVoiceId = args.voiceId || config.default_voice_id || config.defaultVoiceId || config.voice_id || config.voiceId;
    if (!effectiveVoiceId) {
      throw new Error("ElevenLabsAdapter: Voice ID not provided in args or credential config (checked default_voice_id, defaultVoiceId, voice_id, voiceId)");
    }

    const effectiveModelId = args.modelId || config.default_model_id;
    if (!effectiveModelId) {
      throw new Error("MODEL_NOT_CONFIGURED: ElevenLabs model is not configured in voice settings or provider default.");
    }

    console.log(`[TTS] Effective Voice ID: ${effectiveVoiceId}`);
    console.log(`[TTS] Effective Model ID: ${effectiveModelId}`);
    console.log(`[TTS] Voice source: project`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${effectiveVoiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: args.text,
        model_id: effectiveModelId,
        voice_settings: {
          stability: args.stability ?? config.voice_settings?.stability ?? 0.5,
          similarity_boost: args.similarityBoost ?? config.voice_settings?.similarity_boost ?? 0.75,
          style: args.style ?? config.voice_settings?.style ?? 0.0,
          use_speaker_boost: args.useSpeakerBoost ?? config.voice_settings?.use_speaker_boost ?? true
        }
      })
    });

    if (!response.ok) {
      let errorText = await response.text();
      try {
        const json = JSON.parse(errorText);
        if (json.detail && json.detail.message) {
          errorText = json.detail.message;
        } else if (json.detail && typeof json.detail === 'string') {
          errorText = json.detail;
        } else if (json.message) {
          errorText = json.message;
        }
      } catch (e) {
        // Not JSON, keep original text
      }
      throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error("ElevenLabsAdapter: Received empty audio buffer");
    }
    
    return arrayBuffer;
  }

  async listVoices(credential: any): Promise<any[]> {
    const config = credential.config_json || {};
    const apiKey = credential.encrypted_key || config.apiKey || config.api_key;
    if (!apiKey) {
      throw new Error("ElevenLabsAdapter: API key is missing");
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.voices || [];
  }

  async getVoice(credential: any, voiceId: string): Promise<any> {
    const config = credential.config_json || {};
    const apiKey = credential.encrypted_key || config.apiKey || config.api_key;
    if (!apiKey) {
      throw new Error("ElevenLabsAdapter: API key is missing");
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}?with_settings=true`, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }
}
