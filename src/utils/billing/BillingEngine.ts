import { createClient } from "@/utils/supabase/server";
import { ChargeResult, EngineContext } from "./types";
import { WalletEngine } from "./WalletEngine";

export class BillingEngine {
  static async calculateCost(
    feature: 'Script' | 'Voice' | 'Image' | 'Render',
    provider: string,
    model: string
  ): Promise<ChargeResult> {
    const supabase = await createClient();

    // 1. Fetch Provider Model Pricing
    const { data: pricing, error: pricingErr } = await supabase
      .from("provider_model_pricing")
      .select("*")
      .eq("provider", provider)
      .eq("model", model)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (pricingErr || !pricing) {
      throw new Error(`Pricing not found for ${provider}/${model}`);
    }

    // 2. Fetch Credit Rule
    const { data: rule, error: ruleErr } = await supabase
      .from("credit_rules")
      .select("*")
      .eq("feature", feature)
      .eq("provider_model_pricing_id", pricing.id)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (ruleErr || !rule) {
      throw new Error(`Credit rule not found for feature ${feature}`);
    }

    return {
      credits: rule.credit_cost,
      apiCost: pricing.api_cost,
      provider: pricing.provider,
      model: pricing.model,
      pricingVersion: pricing.version,
      creditRuleVersion: rule.version,
      currency: pricing.currency,
    };
  }

  static async executeCharge(context: EngineContext, charge: ChargeResult): Promise<boolean> {
    const success = await WalletEngine.deductCredits(context.userId, charge.credits);
    
    if (success) {
      await WalletEngine.logTransaction(context, charge, 'USAGE');
    }
    
    return success;
  }
}
