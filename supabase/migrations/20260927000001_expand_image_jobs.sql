-- Additive columns for AI Image Expansion
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS output_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS character_ref_url TEXT;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS garment_ref_url TEXT;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS background_ref_url TEXT;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS target_face_url TEXT;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS num_images INTEGER DEFAULT 1;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS pricing_version TEXT;
