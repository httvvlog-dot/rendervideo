import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ElevenLabsAdapter } from "@/utils/provider-runtime/adapters/elevenlabs-adapter";
import { CredentialSelector } from "@/utils/provider-runtime/credential-selector";

function generateDescription(labels: any): string | null {
  if (!labels) return null;
  const parts = [];
  
  if (labels.gender) {
    let genderStr = labels.gender.toLowerCase() === 'female' ? 'Nữ' : 
                    labels.gender.toLowerCase() === 'male' ? 'Nam' : labels.gender;
    
    if (labels.age) {
      const ageStr = labels.age.toLowerCase() === 'young' ? 'trẻ' : 
                     labels.age.toLowerCase() === 'middle_aged' || labels.age.toLowerCase() === 'adult' ? 'trưởng thành' :
                     labels.age.toLowerCase() === 'old' ? 'trung niên' : labels.age;
      parts.push(`${genderStr} ${ageStr}`);
    } else {
      parts.push(genderStr);
    }
  }

  if (labels.accent) {
    parts.push(labels.accent);
  }

  if (parts.length > 0) {
    return parts.join(' • ');
  }
  
  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResponse?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userResponse.user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const voiceId = body.voice_id;

    if (!voiceId || typeof voiceId !== 'string') {
      return NextResponse.json({ error: "Invalid voice_id" }, { status: 400 });
    }

    const selector = new CredentialSelector("elevenlabs");
    const credentials = await selector.getActiveCredentials();

    if (!credentials || credentials.length === 0) {
      return NextResponse.json({ error: "No active ElevenLabs credentials found" }, { status: 500 });
    }

    const adapter = new ElevenLabsAdapter();
    const voice = await adapter.getVoice(credentials[0], voiceId);

    if (!voice || !voice.voice_id) {
      return NextResponse.json({ error: "Voice not found from API" }, { status: 404 });
    }

    const payload = {
      name: voice.name,
      display_name: voice.name,
      gender: voice.labels?.gender || null,
      age: voice.labels?.age || null,
      accent: voice.labels?.accent || null,
      category: voice.category || null,
      preview_url: voice.preview_url || null,
      labels_json: voice.labels || null,
      is_active: true,
    };

    // Check if voice already exists
    const { data: existingVoice } = await supabase
      .from('voice_presets')
      .select('voice_id')
      .eq('voice_id', voice.voice_id)
      .single();

    if (existingVoice) {
      // Update existing
      const { error: updateError } = await supabase
        .from('voice_presets')
        .update(payload)
        .eq('voice_id', voice.voice_id);
        
      if (updateError) throw updateError;
      return NextResponse.json({ success: true, message: "Voice updated", voice_id: voice.voice_id });
    } else {
      // Insert new
      const desc = generateDescription(voice.labels);
      
      const { error: insertError } = await supabase
        .from('voice_presets')
        .insert({
          ...payload,
          voice_id: voice.voice_id,
          description: desc,
        });
        
      if (insertError) throw insertError;
      return NextResponse.json({ success: true, message: "Voice imported", voice_id: voice.voice_id });
    }

  } catch (error: any) {
    console.error("Import voice error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
