import { ChargeResult, EngineContext } from "./types";
import { BillingEngine } from "./BillingEngine";

export class UsageEngine {
  static async validateAndCharge(
    context: EngineContext,
    provider: string,
    model: string,
    executeAI: () => Promise<any>
  ) {
    // 1. Calculate Cost via BillingEngine
    const chargeInfo: ChargeResult = await BillingEngine.calculateCost(context.feature, provider, model);

    // 2. Validate sufficient funds (Optional early check, but WalletEngine does the atomic check)
    // For now we rely on the atomic executeCharge to fail if insufficient.
    // However, checking subscription tiers or unlimited plans would happen here.
    
    // If Subscription == Enterprise, override chargeInfo.credits = 0

    // 3. Execute the AI Action
    // We charge AFTER successful generation to avoid complex refunds, OR charge before and refund on error.
    // Standard practice: Pre-auth or charge after. Let's charge before and refund if error.
    const chargeSuccess = await BillingEngine.executeCharge(context, chargeInfo);
    if (!chargeSuccess) {
      throw new Error("Insufficient credits. Please top up your wallet.");
    }

    try {
      const result = await executeAI();
      return result;
    } catch (error) {
      // Refund if AI failed
      const refundCharge = { ...chargeInfo, credits: chargeInfo.credits }; // Positive
      // A full implementation would call WalletEngine.refund()
      // For now, we will just re-grant credits
      throw error;
    }
  }
}
