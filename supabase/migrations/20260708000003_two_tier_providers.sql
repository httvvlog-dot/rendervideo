-- 1. Create provider_credentials table
CREATE TABLE public.provider_credentials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
    credential_name text NOT NULL,
    priority integer DEFAULT 0,
    weight integer DEFAULT 1,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    health_status text DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'warning', 'offline', 'unknown')),
    latency integer,
    last_error text,
    last_checked_at timestamp with time zone,
    quota_limit integer,
    quota_used integer DEFAULT 0,
    config_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;

-- 2. Migrate existing configurations from providers to provider_credentials
INSERT INTO public.provider_credentials (
    provider_id,
    credential_name,
    priority,
    is_default,
    is_active,
    health_status,
    last_checked_at,
    config_json
)
SELECT 
    id,
    'Default Configuration',
    COALESCE(priority, 0),
    COALESCE(is_default, false),
    COALESCE(is_active, true),
    COALESCE(health_status, 'unknown'),
    last_checked_at,
    config_json
FROM public.providers
WHERE config_json IS NOT NULL AND config_json != '{}'::jsonb;

-- 3. Add UI metadata columns to providers
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS icon_name text;

UPDATE public.providers SET description = 'Large Language Models for text generation' WHERE provider_key = 'openrouter';
UPDATE public.providers SET description = 'Premium AI Voices' WHERE provider_key = 'elevenlabs';
UPDATE public.providers SET description = 'S3-compatible blob storage' WHERE provider_key = 'cloudflare_r2';
UPDATE public.providers SET description = 'OpenAI Speech-to-Text models' WHERE provider_key = 'whisper';
UPDATE public.providers SET description = 'Internal background job processor' WHERE provider_key = 'render_worker';

-- 4. Strip dynamic state columns from providers
ALTER TABLE public.providers DROP COLUMN IF EXISTS config_json;
ALTER TABLE public.providers DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.providers DROP COLUMN IF EXISTS is_default;
ALTER TABLE public.providers DROP COLUMN IF EXISTS priority;
ALTER TABLE public.providers DROP COLUMN IF EXISTS health_status;
ALTER TABLE public.providers DROP COLUMN IF EXISTS last_checked_at;
ALTER TABLE public.providers DROP COLUMN IF EXISTS deleted_at;
