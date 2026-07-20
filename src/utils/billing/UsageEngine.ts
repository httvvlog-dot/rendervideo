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

    // 2. Reserve credits FIRST
    const reserveResult = await WalletEngine.reserveCredits(context, chargeInfo);
    
    if (!reserveResult.success || !reserveResult.transactionId) {
      throw new Error("Insufficient credits. Please top up your wallet.");
    }

    let aiResult: ProviderExecutionResult<T>;

    // 3. Execute the AI Action
    try {
      aiResult = await executeAI();
    } catch (error: any) {
      // AI Failed: Release credits!
      await WalletEngine.releaseCredits(reserveResult.transactionId, `Failed ${context.feature}: ${error.message}`);
      throw error;
    }

    // 4. Calculate actual API Cost (USD)
    const apiCostUsd = await ProviderCostCalculator.calculateCost(aiResult.usage);

    // 5. Commit Credits & Log usage
    await WalletEngine.commitCredits(
      reserveResult.transactionId, 
      chargeInfo, 
      aiResult.usage, 
      apiCostUsd, 
      context.projectId
    );

    return aiResult.result;
  }
}

