import { SupabaseClient } from "@supabase/supabase-js";

export type RenderCostEstimate = {
  credits: number;
  reason: string;
  policyVersion: string;
};

export async function calculateRenderCost(
  supabase: SupabaseClient, 
  width: number, 
  height: number, 
  qualityLabel: string = "Standard"
): Promise<RenderCostEstimate> {
  const pixels = width * height;
  
  // Default costs in case DB lacks settings
  let defaultCosts: Record<string, number> = {
    '720p': 3,
    '1080p': 5,
    '1440p': 8,
    '4k': 15
  };
  
  let policyVersion = '1.0';

  const { data: settings } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'render_credit_720p', 
      'render_credit_1080p', 
      'render_credit_1440p', 
      'render_credit_4k',
      'billing_policy_version'
    ]);

  if (settings) {
    settings.forEach(s => {
      if (s.setting_key === 'billing_policy_version') {
        policyVersion = s.setting_value;
      } else {
        const val = parseInt(s.setting_value);
        if (!isNaN(val)) {
          if (s.setting_key === 'render_credit_720p') defaultCosts['720p'] = val;
          if (s.setting_key === 'render_credit_1080p') defaultCosts['1080p'] = val;
          if (s.setting_key === 'render_credit_1440p') defaultCosts['1440p'] = val;
          if (s.setting_key === 'render_credit_4k') defaultCosts['4k'] = val;
        }
      }
    });
  }

  let credits = defaultCosts['4k'];
  let resLabel = '4K';
  if (pixels <= 1280 * 720) {
    credits = defaultCosts['720p'];
    resLabel = '720p';
  } else if (pixels <= 1920 * 1080) {
    credits = defaultCosts['1080p'];
    resLabel = '1080p';
  } else if (pixels <= 2560 * 1440) {
    credits = defaultCosts['1440p'];
    resLabel = '1440p';
  }
  
  return {
    credits,
    reason: `${resLabel} ${qualityLabel}`.trim(),
    policyVersion
  };
}
