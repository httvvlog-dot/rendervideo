import { createClient } from "@/utils/supabase/server";
import { ChargeResult, EngineContext } from "./types";
import { WalletEngine } from "./WalletEngine";

export class BillingEngine {
  private static pricingCache = new Map<string, any>();
  private static ruleCache = new Map<string, any>();
  private static cacheInitialized = false;

  private static async initCache() {
    if (this.cacheInitialized) return;

    const supabase = await createClient();
    
    const { data: pricings, error: pErr } = await supabase.from("provider_model_pricing").select("*");
    if (pErr) console.error("BillingEngine: Error loading pricing cache:", pErr);
    
    if (!pricings || pricings.length === 0) {
      console.warn("==========================================================");
      console.warn("[WARNING] Billing seed missing. Run: supabase db seed");
      console.warn("==========================================================");
    } else {
      for (const p of pricings) {
        this.pricingCache.set(`${p.provider}/${p.model}`, p);
      }
    }

    const { data: rules, error: rErr } = await supabase.from("credit_rules").select("*");
    if (rErr) console.error("BillingEngine: Error loading rules cache:", rErr);
    
    if (rules && rules.length > 0) {
      for (const r of rules) {
        this.ruleCache.set(`${r.feature}_${r.provider_model_pricing_id}`, r);
      }
    }

    this.cacheInitialized = true;
    
    // Simple TTL for cache (flush every 5 minutes to avoid stale rules)
    setTimeout(() => {
      this.cacheInitialized = false;
      this.pricingCache.clear();
      this.ruleCache.clear();
    }, 5 * 60 * 1000);
  }

  static async calculateCost(
    feature: 'Script' | 'Voice' | 'Image' | 'Render',
    provider: string,
    model: string
  ): Promise<ChargeResult> {
    await this.initCache();

    // 1. Fetch Provider Model Pricing
    const cacheKey = `${provider}/${model}`;
    let pricing = this.pricingCache.get(cacheKey);

    if (!pricing) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("provider_model_pricing")
        .select("*")
        .eq("provider", provider)
        .eq("model", model)
        .order("version", { ascending: false })
        .limit(1)
        .single();
        
      if (!error && data) {
        pricing = data;
        this.pricingCache.set(cacheKey, data);
      }
    }

    if (!pricing) {
      throw new Error(`Pricing not found.\n\nprovider = ${provider}\nmodel = ${model}\n\nDid you run: supabase db seed ?`);
    }

    // 2. Fetch Credit Rule
    const ruleKey = `${feature}_${pricing.id}`;
    let rule = this.ruleCache.get(ruleKey);

    if (!rule) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("credit_rules")
        .select("*")
        .eq("feature", feature)
        .eq("provider_model_pricing_id", pricing.id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        rule = data;
        this.ruleCache.set(ruleKey, data);
      }
    }

    if (!rule) {
      throw new Error(`Credit rule not found for feature ${feature} and pricing ${pricing.id}. Run supabase db seed.`);
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
}
