import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResponse?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const payload: any = {};

    if (body.default_voice_preset_id !== undefined) {
      // Validate that the preset exists and is active
      if (body.default_voice_preset_id !== null) {
        const { data: voiceData, error: voiceError } = await supabase
          .from('voice_presets')
          .select('id, is_active')
          .eq('id', body.default_voice_preset_id)
          .single();

        if (voiceError || !voiceData) {
          return NextResponse.json({ error: "Voice preset not found" }, { status: 404 });
        }
        if (!voiceData.is_active) {
          return NextResponse.json({ error: "Voice preset is inactive" }, { status: 400 });
        }
      }
      payload.default_voice_preset_id = body.default_voice_preset_id;
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userResponse.user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Update user preferences error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
