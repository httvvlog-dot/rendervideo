import { createClient } from "@/utils/supabase/server";
import { ChargeResult, EngineContext, BillingFeature, TransactionStatus } from "./types";
import { WalletEngine } from "./WalletEngine";
import { ProviderCostCalculator } from "./ProviderCostCalculator";

export class BillingEngine {
  private static capabilityCache = new Map<string, any[]>();
  private static pricingCache = new Map<string, any>();
  private static ruleCache = new Map<string, any>();
  private static cacheInitialized = false;
  private static instanceId = Math.random().toString(36);

  private static async initCache() {
    console.count("BillingEngine.initCache");
    
    // TEMPORARY BYPASS: Always reload
    this.cacheInitialized = false;
    this.capabilityCache.clear();
    this.pricingCache.clear();
    this.ruleCache.clear();

    // if (this.cacheInitialized) return;
    const supabase = await createClient();
    
    console.log("=== BillingEngine Query ===");
    console.log(new Date().toISOString());
    console.log({
      instance: this.instanceId,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)
    });
    
    try {
      const { data: capabilities, error: cErr } = await supabase.from("ai_capabilities").select("*").eq("is_active", true).order("priority", { ascending: false });
      
      console.log("=== RAW QUERY RESULT ===");
      console.dir(capabilities, { depth: null });
      console.log({
        error: cErr,
        count: capabilities?.length
      });

      if (cErr) console.error("BillingEngine: Error loading capability cache:", cErr);
      if (!capabilities || capabilities.length === 0) {
        console.warn("[WARNING] Billing seed missing for ai_capabilities. Run: supabase db seed");
      } else {
        for (const cap of capabilities) {
          const list = this.capabilityCache.get(cap.feature) || [];
          list.push(cap);
          this.capabilityCache.set(cap.feature, list);
        }
        console.log("Map size:", this.capabilityCache.size);
        console.dir(Array.from(this.capabilityCache.entries()), { depth: null });
      }
    } catch (ex) {
      console.error("Exception in initCache capabilities loading:", ex);
    }

    // Load Pricing
    const { data: pricings, error: pErr } = await supabase.from("provider_model_pricing").select("*");
    if (!pErr && pricings) {
      for (const p of pricings) {
        this.pricingCache.set(`${p.provider}/${p.model}`, p);
      }
    }

    // Load Rules
    const { data: rules, error: rErr } = await supabase.from("credit_rules").select("*");
    if (!rErr && rules) {
      for (const r of rules) {
        this.ruleCache.set(`${r.feature}_${r.provider_model_pricing_id}`, r);
      }
    }

    this.cacheInitialized = true;
    setTimeout(() => {
      this.cacheInitialized = false;
      this.capabilityCache.clear();
      this.pricingCache.clear();
      this.ruleCache.clear();
    }, 60 * 1000); // 60s TTL
  }

  static async resolveCapability(feature: BillingFeature, requestedProvider?: string, requestedModel?: string) {
    await this.initCache();
    
    const caps = this.capabilityCache.get(feature) || [];
    if (caps.length === 0) {
      throw new Error(`Capability not found. feature=${feature}. Did you run: supabase db seed?`);
    }

    if (requestedProvider && requestedModel) {
      const exact = caps.find(c => c.provider === requestedProvider && c.model === requestedModel);
      if (exact) return exact;
    }

    const defaultCap = caps.find(c => c.is_default);
    if (defaultCap) return defaultCap;

    return caps[0];
  }

  static async getChargeInfo(feature: BillingFeature, requestedProvider?: string, requestedModel?: string, userId?: string): Promise<ChargeResult> {
    const supabase = await createClient();
    
    if (userId) {
      // 1. Fetch User Plan
      let planKey = 'FREE';
      const { data: sub } = await supabase.from('subscriptions').select('plan_id').eq('user_id', userId).single();
      if (sub && sub.plan_id) {
        planKey = sub.plan_id.toUpperCase();
      }

      // 2. Resolve AI Plan Profile
      const { data: profile } = await supabase.from('ai_plan_profiles')
        .select('provider_id, model_id, credits_per_unit, providers(provider_key)')
        .eq('plan_key', planKey)
        .eq('capability', feature)
        .eq('is_active', true)
        .single();
        
      if (profile && profile.providers) {
        return {
          credits: profile.credits_per_unit,
          apiCost: 0, // Calculated post-execution
          provider: Array.isArray(profile.providers) ? profile.providers[0]?.provider_key : (profile.providers as any).provider_key,
          model: profile.model_id,
          pricingVersion: 1,
          creditRuleVersion: 1,
          currency: 'USD',
        };
      }
    }

    // Fallback to Legacy Capabilities
    // TODO: (Technical Debt) Remove model field from ai_capabilities -> Lookup provider_models -> Resolve default model dynamically
    const capability = await this.resolveCapability(feature, requestedProvider, requestedModel);
    const { provider, model } = capability;

    const cacheKey = `${provider}/${model}`;
    const pricing = this.pricingCache.get(cacheKey);
    if (!pricing) {
      throw new Error(`Pricing not found.\n\nprovider = ${provider}\nmodel = ${model}\n\nDid you run: supabase db seed ?`);
    }

    const ruleKey = `${feature}_${pricing.id}`;
    const rule = this.ruleCache.get(ruleKey);
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

  static async executeAndCharge<T>(
    context: EngineContext,
    options: {
      provider?: string;
      model?: string;
      referenceType?: string;
      referenceId?: string;
      description?: string;
    },
    executeAI: (provider: string, model: string) => Promise<{ result: T; usage?: any; actualUsdCost?: number }>
  ): Promise<T> {
    const chargeResult = await this.getChargeInfo(context.feature, options.provider, options.model, context.userId);
    const { provider, model } = chargeResult;

    // 1. Reserve
    const reserve = await WalletEngine.reserveCredits(
      context, 
      chargeResult, 
      options.referenceType, 
      options.referenceId, 
      options.description || `Reserve for ${context.feature}`
    );

    if (!reserve.success || !reserve.transactionId) {
      throw new Error("Insufficient credits or wallet locked.");
    }

    const startTime = Date.now();
    let aiResponse;
    let auditStatus = TransactionStatus.RESERVED;
    let errorMessage = null;

    try {
      // 2. Execute AI
      aiResponse = await executeAI(provider, model);
      
      // Calculate USD Cost if not provided
      const actualUsdCost = aiResponse.actualUsdCost || await ProviderCostCalculator.calculateCost(aiResponse.usage);

      // 3. Commit
      await WalletEngine.commitCredits(
        reserve.transactionId,
        chargeResult,
        aiResponse.usage,
        actualUsdCost,
        context.projectId
      );
      
      auditStatus = TransactionStatus.COMPLETED;
    } catch (e: any) {
      // 4. Rollback
      await WalletEngine.releaseCredits(reserve.transactionId, `AI Execution Failed: ${e.message}`);
      auditStatus = TransactionStatus.FAILED;
      errorMessage = e.message;
      throw e;
    } finally {
      // 5. Audit Log (Fire and forget)
      this.logAudit({
        user_id: context.userId,
        feature: context.feature,
        provider,
        model,
        reserved_credits: chargeResult.credits,
        used_credits: auditStatus === TransactionStatus.COMPLETED ? chargeResult.credits : 0,
        api_cost: aiResponse?.actualUsdCost || chargeResult.apiCost,
        latency_ms: Date.now() - startTime,
        status: auditStatus,
        error_message: errorMessage,
        reference_id: options.referenceId
      }).catch(console.error);
    }

    return aiResponse.result;
  }

  private static async logAudit(log: any) {
    const supabase = await createClient();
    await supabase.from("billing_audit_logs").insert(log);
  }
}
