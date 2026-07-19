import { createClient } from "@/utils/supabase/server";
import { ChargeResult } from "./types";

export class AnalyticsEngine {
  static async logProjectUsage(projectId: string, feature: string, charge: ChargeResult) {
    const supabase = await createClient();
    
    // Check if project_usage exists
    const { data: existing } = await supabase
      .from("project_usage")
      .select("project_id")
      .eq("project_id", projectId)
      .single();

    if (!existing) {
      await supabase.from("project_usage").insert({
        project_id: projectId,
        script_credits: feature === 'Script' ? charge.credits : 0,
        voice_credits: feature === 'Voice' ? charge.credits : 0,
        image_credits: feature === 'Image' ? charge.credits : 0,
        render_credits: feature === 'Render' ? charge.credits : 0,
        total_credits: charge.credits,
        api_cost_usd: charge.apiCost
      });
    } else {
      // Build dynamic update
      const updateData: any = {};
      
      // We must query current to increment properly or use RPC.
      // For simplicity in this demo, we'll fetch then update. 
      // In production, an RPC or Trigger is better to avoid race conditions.
      const { data: current } = await supabase
        .from("project_usage")
        .select("*")
        .eq("project_id", projectId)
        .single();
        
      if (current) {
        if (feature === 'Script') updateData.script_credits = Number(current.script_credits) + charge.credits;
        if (feature === 'Voice') updateData.voice_credits = Number(current.voice_credits) + charge.credits;
        if (feature === 'Image') updateData.image_credits = Number(current.image_credits) + charge.credits;
        if (feature === 'Render') updateData.render_credits = Number(current.render_credits) + charge.credits;
        
        updateData.total_credits = Number(current.total_credits) + charge.credits;
        updateData.api_cost_usd = Number(current.api_cost_usd) + Number(charge.apiCost);
        updateData.updated_at = new Date().toISOString();

        await supabase.from("project_usage").update(updateData).eq("project_id", projectId);
      }
    }
  }
}
