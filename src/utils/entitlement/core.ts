import { SubscriptionTier } from './tier';

export enum Feature {
  PROJECT_CREATE = 'PROJECT_CREATE',
  SCRIPT_GENERATE = 'SCRIPT_GENERATE',
  SCRIPT_EDIT = 'SCRIPT_EDIT',
  AI_IMAGE = 'AI_IMAGE',
  AI_VOICE = 'AI_VOICE',
  TIMELINE = 'TIMELINE',
  RENDER = 'RENDER',
  DOWNLOAD_MP4 = 'DOWNLOAD_MP4'
}

const PLAN_FEATURES: Record<SubscriptionTier, Feature[]> = {
  FREE: [Feature.PROJECT_CREATE, Feature.SCRIPT_GENERATE, Feature.SCRIPT_EDIT],
  PRO: [
    Feature.PROJECT_CREATE, Feature.SCRIPT_GENERATE, Feature.SCRIPT_EDIT,
    Feature.AI_IMAGE, Feature.AI_VOICE, Feature.TIMELINE, Feature.RENDER, Feature.DOWNLOAD_MP4
  ],
  VIP: [
    Feature.PROJECT_CREATE, Feature.SCRIPT_GENERATE, Feature.SCRIPT_EDIT,
    Feature.AI_IMAGE, Feature.AI_VOICE, Feature.TIMELINE, Feature.RENDER, Feature.DOWNLOAD_MP4
  ],
};

export function assertFeatureAccess(tier: SubscriptionTier, feature: Feature): { allowed: boolean; code?: string; message?: string } {
  if (!PLAN_FEATURES[tier].includes(feature)) {
    return {
      allowed: false,
      code: "PLAN_FEATURE_LOCKED",
      message: `Feature ${feature} is not available for ${tier} plan. Please upgrade to PRO.`
    };
  }
  return { allowed: true };
}
