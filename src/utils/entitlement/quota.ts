import { SupabaseClient } from '@supabase/supabase-js';
import { Feature } from './core';
import { SubscriptionTier } from './tier';

export async function assertQuota(
  supabase: SupabaseClient, 
  userId: string, 
  tier: SubscriptionTier, 
  feature: Feature
): Promise<{ allowed: boolean; code?: string; message?: string }> {
  
  if (feature === Feature.SCRIPT_GENERATE) {
    if (tier === 'FREE') {
      const MAX_FREE_SCRIPTS = 5;
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('scripts')
        .select('id, projects!inner(user_id)')
        .eq('projects.user_id', userId)
        .gte('created_at', startOfMonth.toISOString());
        
      if (error) {
        console.error("[Quota Check] Error checking scripts quota:", error);
        return { allowed: false, code: "QUOTA_ERROR", message: "Could not verify your usage quota." };
      }

      const count = data?.length || 0;
      if (count >= MAX_FREE_SCRIPTS) {
        return { 
          allowed: false, 
          code: "QUOTA_EXCEEDED", 
          message: `You have reached your limit of ${MAX_FREE_SCRIPTS} script generations for this month on the FREE plan. Please upgrade to PRO.` 
        };
      }
    }
  }

  // All other features/tiers have unlimited quota for now, since BillingEngine handles their credit limits
  return { allowed: true };
}
