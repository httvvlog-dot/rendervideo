-- Add UNIQUE constraint to credit_rules to ensure idempotency when seeding and configuring
ALTER TABLE public.credit_rules
ADD CONSTRAINT credit_rules_feature_provider_model_pricing_id_version_key 
UNIQUE (feature, provider_model_pricing_id, version);
