import { createClient } from "@/utils/supabase/server";
import { UsageMetadata } from "../provider-runtime/types";

export class ProviderCostCalculator {
  static async calculateCost(usage: UsageMetadata): Promise<number> {
    if (usage.pricingType === "none") return 0;
    
    const supabase = await createClient();

    // Fetch Pricing
    const { data: pricing, error } = await supabase
      .from("provider_model_pricing")
      .select("*")
      .eq("provider", usage.provider)
      .eq("model", usage.model)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error || !pricing) {
      console.warn(`[ProviderCostCalculator] Pricing not found for ${usage.provider}/${usage.model}`);
      return 0; // Return 0 to not break the pipeline, but log it
    }

    let cost = 0;
    
    // For legacy single api_cost field fallback
    const fallbackCost = Number(pricing.api_cost) || 0;
    
    // Check if new schema fields exist
    const inputCost = pricing.input_cost !== undefined ? Number(pricing.input_cost) : fallbackCost;
    const outputCost = pricing.output_cost !== undefined ? Number(pricing.output_cost) : 0;
    
    // Parse unit (e.g. "1M tokens", "1K chars", "second", "image")
    const unitStr = (pricing.unit || "per_unit").toLowerCase();
    let divisor = 1;
    if (unitStr.includes("1m")) divisor = 1000000;
    else if (unitStr.includes("1k")) divisor = 1000;

    switch (usage.pricingType) {
      case "token":
        const promptTokens = usage.promptTokens || 0;
        const completionTokens = usage.completionTokens || 0;
        cost = (promptTokens * inputCost + completionTokens * outputCost) / divisor;
        break;
      case "character":
        cost = ((usage.characters || 0) * inputCost) / divisor;
        break;
      case "image":
        cost = ((usage.images || 0) * inputCost) / divisor;
        break;
      case "second":
        cost = ((usage.durationSeconds || 0) * inputCost) / divisor;
        break;
      default:
        cost = fallbackCost;
        break;
    }

    return Number(cost.toFixed(6));
  }
}
