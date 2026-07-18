import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ProviderRuntime } from "@/utils/provider-runtime";
import { ElevenLabsAdapter } from "@/utils/provider-runtime/adapters/elevenlabs-adapter";

export async function POST(request: Request) {
  try {
    const { voice_id } = await request.json();
    if (!voice_id) {
      return NextResponse.json({ error: "Missing voice_id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch the voice preset
    const { data: voice, error: voiceErr } = await supabase
      .from("voice_presets")
      .select("*")
      .eq("id", voice_id)
      .single();

    if (voiceErr || !voice) {
      return NextResponse.json({ error: "Voice not found" }, { status: 404 });
    }

    // Resolve model
    let targetModelId = voice.model_id;
    if (!targetModelId) {
      // Fallback to provider default
      const { data: creds } = await supabase
        .from("provider_credentials")
        .select("config_json")
        .eq("provider_id", voice.provider || "elevenlabs")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(1);
      
      if (creds && creds.length > 0) {
        targetModelId = creds[0].config_json?.default_model_id;
      }
    }

    const testText = "Xin chào. Hố đen là một vùng không gian có lực hấp dẫn rất mạnh.";

    console.log(`[TEST TTS] Voice ID: ${voice.voice_id} | Model ID: ${targetModelId || 'Not Configured'}`);

    const providerKey = voice.provider || "elevenlabs";
    const runtime = new ProviderRuntime(providerKey);
    const audioBuffer = await runtime.execute(new ElevenLabsAdapter(), {
      step: "VOICE",
      // projectId isn't strictly needed for test generation but we pass a dummy if needed
      projectId: "test", 
      args: {
        text: testText,
        voiceId: voice.voice_id,
        modelId: targetModelId
      }
    });

    if (!audioBuffer) {
      return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });

  } catch (error: any) {
    console.error("[TEST TTS Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
