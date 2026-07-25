-- Migration: Advanced Billing Capabilities & Audit Logs

-- 1. AI Capabilities Registry
CREATE TABLE IF NOT EXISTS public.ai_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature VARCHAR(50) NOT NULL, -- e.g., SCRIPT_GENERATION, VOICE_GENERATION
    provider VARCHAR(50) NOT NULL, -- e.g., openrouter, elevenlabs
    model VARCHAR(100) NOT NULL, -- e.g., deepseek/deepseek-v4-flash
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    priority INT DEFAULT 0, -- Higher number = higher priority
    fallback_id UUID REFERENCES public.ai_capabilities(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feature, provider, model)
);

-- Ensure only one default per feature
CREATE UNIQUE INDEX ai_capabilities_one_default_per_feature 
ON public.ai_capabilities (feature) 
WHERE is_default = true;

-- 2. Billing Audit Logs
CREATE TABLE IF NOT EXISTS public.billing_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    reserved_credits INT NOT NULL,
    used_credits INT,
    api_cost DECIMAL(10,4),
    latency_ms INT,
    status VARCHAR(50) NOT NULL, -- RESERVED, COMPLETED, FAILED, REFUNDED
    error_message TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- We don't strictly need to alter wallet_transactions.status since it's a VARCHAR(50),
-- but we should update the default just in case to be consistent.
ALTER TABLE public.wallet_transactions ALTER COLUMN status SET DEFAULT 'COMPLETED';
