-- Create ai_models table
CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    api_slug VARCHAR(255) NOT NULL,
    capability VARCHAR(50) NOT NULL, -- 'image', 'video', 'voice', 'text', 'embedding', etc.
    provider_family VARCHAR(100),
    features JSONB DEFAULT '{}'::jsonb,
    max_resolution VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, api_slug)
);

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to ai_models" ON public.ai_models
    FOR SELECT USING (true);
    
CREATE POLICY "Allow admin all access to ai_models" ON public.ai_models
    FOR ALL USING ( public.is_admin() );

-- Add ai_model_id to ai_plan_profiles
ALTER TABLE public.ai_plan_profiles
    ADD COLUMN ai_model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL;

-- Seed Fal.ai models
DO $$ 
DECLARE
    falai_id UUID;
    schnell_id UUID;
    dev_id UUID;
    pro_id UUID;
    klein_id UUID;
BEGIN
    SELECT id INTO falai_id FROM public.providers WHERE provider_key = 'falai' LIMIT 1;
    
    IF falai_id IS NOT NULL THEN
        -- Insert Models
        INSERT INTO public.ai_models (provider_id, display_name, api_slug, capability, provider_family, features)
        VALUES 
        (falai_id, 'FLUX Schnell', 'fal-ai/flux/schnell', 'IMAGE_GENERATION', 'flux', '{"seed": true, "lora": false, "max_images": 4}'::jsonb),
        (falai_id, 'FLUX Dev', 'fal-ai/flux/dev', 'IMAGE_GENERATION', 'flux', '{"seed": true, "lora": true, "max_images": 4}'::jsonb),
        (falai_id, 'FLUX Pro v1.1', 'fal-ai/flux-pro/v1.1', 'IMAGE_GENERATION', 'flux', '{"seed": true, "lora": false, "max_images": 1}'::jsonb),
        (falai_id, 'FLUX Klein 4B', 'fal-ai/flux-2/klein/4b', 'IMAGE_GENERATION', 'flux', '{"seed": true, "lora": false, "max_images": 4}'::jsonb)
        ON CONFLICT (provider_id, api_slug) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            features = EXCLUDED.features;

        -- Update old profiles with new ai_model_id based on api_slug
        UPDATE public.ai_plan_profiles p
        SET ai_model_id = m.id
        FROM public.ai_models m
        WHERE p.model_id = m.api_slug;
    END IF;
END $$;

-- Drop the old model_id column
ALTER TABLE public.ai_plan_profiles
    DROP COLUMN model_id;
