ALTER TABLE public.provider_models
ADD COLUMN IF NOT EXISTS badge TEXT,
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'image';

-- Seed Fal.ai Image Models
INSERT INTO public.provider_models (provider, model_id, name, description, badge, is_recommended, pricing_type, supports_tts, supports_sts)
VALUES 
('falai', 'fal-ai/flux-pro/v1', 'FLUX Pro', 'Best quality for Storytelling, Marketing, Products', '⭐ Recommended', true, 'image', false, false),
('falai', 'fal-ai/flux/schnell', 'FLUX Schnell', 'Quick generation with great quality', '⚡ Fast', false, 'image', false, false),
('falai', 'fal-ai/flux-klein-9b', 'FLUX Klein 9B', 'Balanced quality and cost', '💰 Cost Saving', false, 'image', false, false),
('falai', 'fal-ai/flux-klein-4b', 'FLUX Klein 4B', 'Fastest and cheapest', '🆓 Free Tier', false, 'image', false, false),
('falai', 'fal-ai/flux-kontext/max', 'FLUX Kontext Max', 'Reference image & character consistency', '🎨 Image Editing', false, 'image', false, false)
ON CONFLICT (provider, model_id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    badge = EXCLUDED.badge,
    is_recommended = EXCLUDED.is_recommended;

-- Seed OpenAI Image Models
INSERT INTO public.provider_models (provider, model_id, name, description, badge, is_recommended, pricing_type, supports_tts, supports_sts)
VALUES 
('openai', 'dall-e-3', 'DALL-E 3', 'High accuracy and instruction following', '⭐ Recommended', true, 'image', false, false),
('openai', 'dall-e-2', 'DALL-E 2', 'Legacy faster model', '⚡ Fast', false, 'image', false, false)
ON CONFLICT (provider, model_id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    badge = EXCLUDED.badge,
    is_recommended = EXCLUDED.is_recommended;

-- Seed Ideogram Models
INSERT INTO public.provider_models (provider, model_id, name, description, badge, is_recommended, pricing_type, supports_tts, supports_sts)
VALUES 
('ideogram', 'ideogram-v3', 'Ideogram v3', 'Best typography and text rendering', '⭐ Recommended', true, 'image', false, false)
ON CONFLICT (provider, model_id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    badge = EXCLUDED.badge,
    is_recommended = EXCLUDED.is_recommended;

-- Seed Replicate Models
INSERT INTO public.provider_models (provider, model_id, name, description, badge, is_recommended, pricing_type, supports_tts, supports_sts)
VALUES 
('replicate', 'black-forest-labs/flux-pro', 'FLUX Pro', 'BFL API hosted on Replicate', NULL, false, 'image', false, false)
ON CONFLICT (provider, model_id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    badge = EXCLUDED.badge,
    is_recommended = EXCLUDED.is_recommended;
