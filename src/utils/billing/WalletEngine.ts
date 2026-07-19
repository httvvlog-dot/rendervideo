import { createClient } from "@/utils/supabase/server";
import { ChargeResult, EngineContext } from "./types";
import { AnalyticsEngine } from "./AnalyticsEngine";

export class WalletEngine {
  static async deductCredits(userId: string, amount: number): Promise<boolean> {
    const supabase = await createClient();
    
    // Call the stored procedure to safely deduct from buckets
    const { data, error } = await supabase.rpc('charge_wallet_buckets', {
      p_user_id: userId,
      p_amount: amount
    });

    if (error || !data || data.length === 0) {
      console.error("WalletEngine deduction failed:", error);
      return false;
    }

    return data[0].success;
  }

  static async logTransaction(
    context: EngineContext, 
    charge: ChargeResult, 
    type: 'PURCHASE' | 'BONUS' | 'REFUND' | 'USAGE' | 'ADMIN_GRANT' | 'ADMIN_REMOVE' | 'EXPIRED'
  ) {
    const supabase = await createClient();
    
    // Get wallet id
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", context.userId)
      .single();

    if (!wallet) return;

    // Calculate remaining total balance
    const { data: buckets } = await supabase
      .from("wallet_credit_buckets")
      .select("balance")
      .eq("wallet_id", wallet.id);
      
    const balanceAfter = (buckets || []).reduce((acc, b) => acc + Number(b.balance), 0);

    const amount = type === 'USAGE' ? -charge.credits : charge.credits;

    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      transaction_type: type,
      amount: amount,
      balance_after: balanceAfter,
      feature: context.feature,
      snapshot: {
        provider: charge.provider,
        model: charge.model,
        credit_rule_version: charge.creditRuleVersion,
        pricing_version: charge.pricingVersion,
        credits: charge.credits,
        api_cost: charge.apiCost,
        currency: charge.currency
      }
    });

    // Fire & Forget Analytics
    if (context.projectId && type === 'USAGE') {
      AnalyticsEngine.logProjectUsage(context.projectId, context.feature, charge).catch(console.error);
    }
  }
}
