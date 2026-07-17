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

export async function GET(req: Request) {
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

    const selector = new CredentialSelector("elevenlabs");
    const credentials = await selector.getActiveCredentials();

    if (!credentials || credentials.length === 0) {
      return NextResponse.json({ error: "No active ElevenLabs credentials found" }, { status: 500 });
    }

    const adapter = new ElevenLabsAdapter();
    const apiVoices = await adapter.listVoices(credentials[0]);

    if (!apiVoices || apiVoices.length === 0) {
      return NextResponse.json({ message: "No voices found from API" });
    }

    const { data: existingVoices, error: fetchError } = await supabase
      .from('voice_presets')
      .select('voice_id, name, display_name, description');

    if (fetchError) {
      throw fetchError;
    }

    const existingVoiceIds = new Set((existingVoices || []).map(v => v.voice_id));
    const apiVoiceIds = new Set(apiVoices.map((v: any) => v.voice_id));

    let inserted = 0;
    let updated = 0;
    let deactivated = 0;

    for (const voice of apiVoices) {
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

      if (!existingVoiceIds.has(voice.voice_id)) {
        // Auto-generate description for new voices
        const desc = generateDescription(voice.labels);
        
        const { error: insertError } = await supabase
          .from('voice_presets')
          .insert({
            ...payload,
            voice_id: voice.voice_id,
            description: desc,
          });
        
        if (insertError) console.error("Insert error for", voice.voice_id, insertError);
        else inserted++;
      } else {
        // Update existing (don't overwrite custom display_name or description)
        const { error: updateError } = await supabase
          .from('voice_presets')
          .update({
            name: payload.name,
            gender: payload.gender,
            age: payload.age,
            accent: payload.accent,
            category: payload.category,
            preview_url: payload.preview_url,
            labels_json: payload.labels_json,
            is_active: true,
          })
          .eq('voice_id', voice.voice_id);
          
        if (updateError) console.error("Update error for", voice.voice_id, updateError);
        else updated++;
      }
    }

    // Deactivate missing voices
    const missingVoiceIds = [...existingVoiceIds].filter(id => !apiVoiceIds.has(id));
    if (missingVoiceIds.length > 0) {
      const { error: deactivateError } = await supabase
        .from('voice_presets')
        .update({ is_active: false })
        .in('voice_id', missingVoiceIds);
        
      if (deactivateError) console.error("Deactivate error", deactivateError);
      else deactivated = missingVoiceIds.length;
    }

    return NextResponse.json({ 
      success: true, 
      inserted, 
      updated, 
      deactivated 
    });

  } catch (error: any) {
    console.error("Sync voices error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
