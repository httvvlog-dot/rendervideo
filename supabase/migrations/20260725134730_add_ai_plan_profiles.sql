CREATE TABLE IF NOT EXISTS public.ai_plan_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_key VARCHAR(50) NOT NULL, -- e.g., 'FREE', 'PRO', 'VIP'
    capability VARCHAR(50) NOT NULL, -- e.g., 'image', 'video', 'tts', 'llm'
    provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
    model_id VARCHAR(100) NOT NULL, -- e.g., 'fal-ai/flux-pro/v1'
    credits_per_unit INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_key, capability)
);

ALTER TABLE public.ai_plan_profiles ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users or anon (if needed), admin full access
CREATE POLICY "Allow public read access to ai_plan_profiles" ON public.ai_plan_profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow admin all access to ai_plan_profiles" ON public.ai_plan_profiles
    FOR ALL USING ( public.is_admin() );

-- Seed Default Profiles for Image Capability
-- Wait, we need to know the provider IDs for Fal.ai. 
-- Since IDs are generated, we can insert by joining with providers table.

DO $$ 
DECLARE
    falai_id UUID;
BEGIN
    SELECT id INTO falai_id FROM public.providers WHERE provider_key = 'falai' LIMIT 1;
    
    IF falai_id IS NOT NULL THEN
        INSERT INTO public.ai_plan_profiles (plan_key, capability, provider_id, model_id, credits_per_unit, is_active)
        VALUES 
        ('FREE', 'IMAGE_GENERATION', falai_id, 'fal-ai/flux-klein-4b', 1, true),
        ('PRO', 'IMAGE_GENERATION', falai_id, 'fal-ai/flux-klein-9b', 2, true),
        ('VIP', 'IMAGE_GENERATION', falai_id, 'fal-ai/flux-pro/v1', 4, true)
        ON CONFLICT (plan_key, capability) DO UPDATE SET
            provider_id = EXCLUDED.provider_id,
            model_id = EXCLUDED.model_id,
            credits_per_unit = EXCLUDED.credits_per_unit;
    END IF;
END $$;
