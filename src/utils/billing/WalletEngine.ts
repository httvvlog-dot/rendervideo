import { createClient } from "@/utils/supabase/server";
import { ChargeResult, EngineContext } from "./types";
import { AnalyticsEngine } from "./AnalyticsEngine";

export class WalletEngine {
  static async reserveCredits(
    context: EngineContext,
    charge: ChargeResult,
    referenceType?: string,
    referenceId?: string,
    description?: string,
    timeoutMinutes: number = 15
  ): Promise<{ success: boolean; transactionId?: string; availableCredits?: number }> {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('reserve_credits', {
      p_user_id: context.userId,
      p_amount: charge.credits,
      p_feature: context.feature,
      p_reference_type: referenceType,
      p_reference_id: referenceId,
      p_provider: charge.provider,
      p_description: description || `Reserve for ${context.feature}`,
      p_metadata: {
        provider: charge.provider,
        model: charge.model,
        credit_rule_version: charge.creditRuleVersion,
        pricing_version: charge.pricingVersion
      },
      p_timeout_minutes: timeoutMinutes
    });

    if (error || !data || data.length === 0) {
      console.error("WalletEngine reserve failed:", error);
      return { success: false };
    }

    return {
      success: data[0].success,
      transactionId: data[0].transaction_id,
      availableCredits: data[0].available_credits
    };
  }

  static async commitCredits(
    transactionId: string,
    charge: ChargeResult,
    usageMetadata?: any,
    actualUsdCost?: number,
    projectId?: string
  ): Promise<boolean> {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('commit_credits', {
      p_transaction_id: transactionId,
      p_provider_metadata: usageMetadata,
      p_actual_usd_cost: actualUsdCost,
      p_model: charge.model,
      p_pricing_version: charge.pricingVersion,
      p_project_id: projectId
    });

    if (error) {
      console.error("WalletEngine commit failed:", error);
      return false;
    }

    if (data && projectId) {
      // Fire & Forget Analytics
      AnalyticsEngine.logProjectCredits(projectId, "USAGE", charge.credits).catch(console.error);
    }
    
    return !!data;
  }

  static async releaseCredits(
    transactionId: string,
    reason: string
  ): Promise<boolean> {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('release_credits', {
      p_transaction_id: transactionId,
      p_reason: reason
    });

    if (error) {
      console.error("WalletEngine release failed:", error);
      return false;
    }

    return !!data;
  }
}


