-- Migration: Billing Pricing Expansion
-- Upgrades provider_model_pricing into a robust schema capable of serving the BillingEngine long-term.

ALTER TABLE public.provider_model_pricing
    ADD COLUMN IF NOT EXISTS input_cost numeric(12,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS output_cost numeric(12,6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cached_input_cost numeric(12,6),
    ADD COLUMN IF NOT EXISTS unit varchar(50) DEFAULT '1M tokens',
    ADD COLUMN IF NOT EXISTS supports_usage_reporting boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS billing_strategy varchar(50) DEFAULT 'PER_TOKEN',
    ADD COLUMN IF NOT EXISTS effective_from timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS effective_to timestamptz;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_api_cost_non_negative' AND conrelid = 'public.provider_model_pricing'::regclass) THEN
        ALTER TABLE public.provider_model_pricing ADD CONSTRAINT chk_api_cost_non_negative CHECK (api_cost >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_input_cost_non_negative' AND conrelid = 'public.provider_model_pricing'::regclass) THEN
        ALTER TABLE public.provider_model_pricing ADD CONSTRAINT chk_input_cost_non_negative CHECK (input_cost >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_output_cost_non_negative' AND conrelid = 'public.provider_model_pricing'::regclass) THEN
        ALTER TABLE public.provider_model_pricing ADD CONSTRAINT chk_output_cost_non_negative CHECK (output_cost >= 0);
    END IF;
END $$;
