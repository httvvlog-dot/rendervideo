import { ProviderAdapter, ProviderExecutionResult, CredentialAdapter, TestConnectionResult } from "../types"

export interface ElevenLabsArgs {
  text: string
  voiceId?: string
  modelId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

export type ElevenLabsResult = ArrayBuffer

export class ElevenLabsAdapter implements ProviderAdapter<ElevenLabsArgs, ElevenLabsResult>, CredentialAdapter {
  normalizeConfig(config: any) {
    const newConfig = { ...config };
    if (typeof newConfig.apiKey === 'string') {
      newConfig.apiKey = newConfig.apiKey.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[\r\n]+/g, '');
    }
    return newConfig;
  }

  validateCredential(config: any): TestConnectionResult {
    const apiKey = config.apiKey || config.api_key;
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        status: "INVALID",
        runtimeStatus: "UNKNOWN",
        latency: 0,
        provider: "elevenlabs",
        message: "ElevenLabs API Key is missing or invalid"
      };
    }
    return {
      status: "VALID",
      runtimeStatus: "UNKNOWN",
      latency: 0,
      provider: "elevenlabs"
    };
  }

  async testConnection(options: { credential: any }): Promise<TestConnectionResult> {
    const { credential } = options;
    const config = credential.config_json || {};
    const apiKey = config.apiKey || config.api_key;
    
    if (!apiKey) {
      return { status: "INVALID", runtimeStatus: "UNKNOWN", latency: 0, provider: "elevenlabs", message: "Missing API Key" };
    }

    const startTime = Date.now();
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/voices", { 
        headers: { "xi-api-key": apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(10000)
      });
      const latency = Date.now() - startTime;
      if (!res.ok) {
        if (res.status === 401) {
          return { status: "UNAUTHORIZED", runtimeStatus: "HEALTHY", latency, provider: "elevenlabs", message: "Unauthorized (401). Invalid API Key." };
        } else if (res.status === 429) {
          return { status: "VALID", runtimeStatus: "RATE_LIMITED", latency, provider: "elevenlabs", message: "Rate Limited (429)." };
        }
        return { status: "VALID", runtimeStatus: "NETWORK_ERROR", latency, provider: "elevenlabs", message: `API Error: ${res.status}` };
      }
      return { status: "VALID", runtimeStatus: "HEALTHY", latency, provider: "elevenlabs", message: "Connection successful" };
    } catch (e: any) {
      let runtimeStatus: "TIMEOUT" | "NETWORK_ERROR" = "NETWORK_ERROR";
      if (e.name === "TimeoutError") runtimeStatus = "TIMEOUT";
      return { status: "VALID", runtimeStatus, latency: Date.now() - startTime, provider: "elevenlabs", message: e.message };
    }
  }

  async execute(credential: any, args: ElevenLabsArgs): Promise<ProviderExecutionResult<ElevenLabsResult>> {
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
    console.log(`[TTS] Exact Text (JSON.stringify):`, JSON.stringify(args.text));

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
    
    return {
      result: arrayBuffer,
      usage: {
        provider: "elevenlabs",
        model: effectiveModelId,
        pricingType: "character",
        characters: args.text.length
      }
    };
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

  async getModels(credential: any): Promise<any[]> {
    const config = credential.config_json || {};
    const apiKey = credential.encrypted_key || config.apiKey || config.api_key;
    if (!apiKey) {
      throw new Error("ElevenLabsAdapter: API key is missing");
    }

    const response = await fetch("https://api.elevenlabs.io/v1/models", {
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
