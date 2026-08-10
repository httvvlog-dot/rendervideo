import { SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionTier = 'FREE' | 'PRO' | 'VIP';

export async function resolveSubscriptionTier(supabase: SupabaseClient, userId: string): Promise<SubscriptionTier> {
  const { data } = await supabase.from('profiles').select('image_tier').eq('id', userId).single();
  return (data?.image_tier || 'FREE').toUpperCase() as SubscriptionTier;
}
