import { createClient } from "@/utils/supabase/server";
import { UsageMetadata } from "../provider-runtime/types";

export class AnalyticsEngine {
  static async logProjectCredits(projectId: string, feature: string, credits: number) {
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
        script_credits: feature === 'Script' ? credits : 0,
        voice_credits: feature === 'Voice' ? credits : 0,
        image_credits: feature === 'Image' ? credits : 0,
        render_credits: feature === 'Render' ? credits : 0,
        total_credits: credits,
        api_cost_usd: 0 // Handled separately now
      });
    } else {
      // Build dynamic update
      const updateData: any = {};
      const { data: current } = await supabase
        .from("project_usage")
        .select("*")
        .eq("project_id", projectId)
        .single();
        
      if (current) {
        if (feature === 'Script') updateData.script_credits = Number(current.script_credits) + credits;
        if (feature === 'Voice') updateData.voice_credits = Number(current.voice_credits) + credits;
        if (feature === 'Image') updateData.image_credits = Number(current.image_credits) + credits;
        if (feature === 'Render') updateData.render_credits = Number(current.render_credits) + credits;
        
        updateData.total_credits = Number(current.total_credits) + credits;
        updateData.updated_at = new Date().toISOString();

        await supabase.from("project_usage").update(updateData).eq("project_id", projectId);
      }
    }
  }

  static async logApiCost(
    projectId: string | null,
    userId: string,
    sectionId: string | null,
    feature: string,
    usage: UsageMetadata,
    apiCostUsd: number
  ) {
    const supabase = await createClient();

    // 1. Insert into AI Usage Ledger (ai_usage_logs)
    await supabase.from("ai_usage_logs").insert({
      project_id: projectId,
      user_id: userId,
      section_id: sectionId,
      feature: feature,
      provider: usage.provider,
      model: usage.model,
      usage_metadata: usage,
      api_cost: apiCostUsd,
      currency: "USD",
      status: "SUCCESS"
    });

    // 2. Increment api_cost_usd in project_usage if projectId exists
    if (projectId) {
      const { data: current } = await supabase
        .from("project_usage")
        .select("api_cost_usd")
        .eq("project_id", projectId)
        .single();

      if (current) {
        await supabase.from("project_usage").update({
          api_cost_usd: Number(current.api_cost_usd) + apiCostUsd,
          updated_at: new Date().toISOString()
        }).eq("project_id", projectId);
      } else {
        // Create if doesn't exist (e.g. free generation that didn't deduct credits)
        await supabase.from("project_usage").insert({
          project_id: projectId,
          api_cost_usd: apiCostUsd
        });
      }
    }
  }
}
