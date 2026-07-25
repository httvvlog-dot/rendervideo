export enum BillingFeature {
  SCRIPT_GENERATION = 'SCRIPT_GENERATION',
  VOICE_GENERATION = 'VOICE_GENERATION',
  IMAGE_GENERATION = 'IMAGE_GENERATION',
  VIDEO_RENDER = 'VIDEO_RENDER'
}

export enum TransactionStatus {
  RESERVED = 'RESERVED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export interface ChargeResult {
  credits: number;
  apiCost: number;
  provider: string;
  model: string;
  pricingVersion: number;
  creditRuleVersion: number;
  currency: string;
}

export interface EngineContext {
  userId: string;
  projectId?: string;
  feature: BillingFeature;
}
