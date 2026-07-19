-- 1. EXTEND PROVIDER MODEL PRICING
ALTER TABLE public.provider_model_pricing
ADD COLUMN IF NOT EXISTS input_cost DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS output_cost DECIMAL(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT '1M tokens',
ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ;

-- Backfill existing data to the new columns for safe transition
UPDATE public.provider_model_pricing
SET input_cost = api_cost, output_cost = api_cost, unit = 'per_unit'
WHERE input_cost = 0 AND output_cost = 0;

-- 2. CREATE AI USAGE LEDGER
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    section_id UUID, -- Optional, depending on if it's tied to a script section
    feature VARCHAR(50) NOT NULL, -- Script, Voice, Image, Render
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    usage_metadata JSONB NOT NULL, -- { promptTokens, completionTokens, characters, duration, etc }
    api_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'SUCCESS', -- SUCCESS, FAILED, TIMEOUT
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
