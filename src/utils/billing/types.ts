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
  feature: 'Script' | 'Voice' | 'Image' | 'Render';
}
