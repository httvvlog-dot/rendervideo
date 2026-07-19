import { ChargeResult, EngineContext } from "./types";
import { BillingEngine } from "./BillingEngine";
import { ProviderCostCalculator } from "./ProviderCostCalculator";
import { AnalyticsEngine } from "./AnalyticsEngine";
import { WalletEngine } from "./WalletEngine";
import { ProviderExecutionResult } from "../provider-runtime/types";
import { createClient } from "@/utils/supabase/server";

export class UsageEngine {
  static async executeAndCharge<T>(
    context: EngineContext,
    provider: string,
    model: string,
    executeAI: () => Promise<ProviderExecutionResult<T>>
  ): Promise<T> {
    // 1. Calculate Credit Cost via BillingEngine
    const chargeInfo: ChargeResult = await BillingEngine.calculateCost(context.feature, provider, model);

    // 2. Pre-auth (Optional: we can verify Wallet balance here before executing AI)
    // For now we'll do charge AFTER success. If they don't have enough, AI won't run, or runs but goes negative.
    // Let's rely on WalletEngine.deductCredits which prevents going below 0 via constraint.
    const supabase = await createClient();
    const { data: balanceData } = await supabase.rpc('get_wallet_balance', { p_user_id: context.userId });
    if (!balanceData || balanceData < chargeInfo.credits) {
      throw new Error("Insufficient credits. Please top up your wallet.");
    }

    let aiResult: ProviderExecutionResult<T>;

    // 3. Execute the AI Action
    try {
      aiResult = await executeAI();
    } catch (error: any) {
      // Log failed attempt to AI Usage Ledger if needed, but DO NOT charge credits
      const supabaseAdmin = await createClient(); // Use service role for logging
      await supabaseAdmin.from("ai_usage_logs").insert({
        project_id: context.projectId || null,
        user_id: context.userId,
        feature: context.feature,
        provider: provider,
        model: model,
        usage_metadata: { pricingType: "none", error: error.message },
        api_cost: 0,
        currency: "USD",
        status: "FAILED",
        error_message: error.message || "Unknown error"
      });
      throw error;
    }

    // 4. Calculate actual API Cost (USD)
    const apiCostUsd = await ProviderCostCalculator.calculateCost(aiResult.usage);

    // 5. Log API Cost to ai_usage_logs and Analytics
    await AnalyticsEngine.logApiCost(
      context.projectId || null,
      context.userId,
      null, // sectionId not strictly tracked here unless in context
      context.feature,
      aiResult.usage,
      apiCostUsd
    ).catch(console.error); // Fire and forget logging

    // 6. Deduct User Credits
    const chargeSuccess = await BillingEngine.executeCharge(context, chargeInfo);
    if (!chargeSuccess) {
      // Ideally we would rollback or mark as negative balance
      console.error(`[UsageEngine] Critical: Failed to charge ${chargeInfo.credits} credits from ${context.userId} after successful generation.`);
    } else {
      // Log credits to Project Usage Analytics
      if (context.projectId) {
        await AnalyticsEngine.logProjectCredits(context.projectId, context.feature, chargeInfo.credits).catch(console.error);
      }
    }

    return aiResult.result;
  }
}
