-- Migration: Add Missing Unique Constraints
-- Fixes ON CONFLICT errors in seed.sql

DO $$
BEGIN
    -- credit_rules was missing the UNIQUE constraint for (feature, provider_model_pricing_id, version)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_rules_feature_pricing_version_key') THEN
        ALTER TABLE public.credit_rules 
        ADD CONSTRAINT credit_rules_feature_pricing_version_key 
        UNIQUE(feature, provider_model_pricing_id, version);
    END IF;

    -- Note: system_settings, provider_model_pricing, and ai_capabilities already have 
    -- UNIQUE constraints defined inline during their CREATE TABLE statements.
    -- PostgreSQL automatically enforces those for ON CONFLICT. 
    -- This migration ensures credit_rules is also fully compliant.
END $$;
