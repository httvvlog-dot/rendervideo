-- 1. Add provider_key column (temporarily nullable)
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS provider_key text;

-- 2. Soft Migration: Map existing records to the 5 allowed keys
UPDATE public.providers
SET provider_key = 'openrouter'
WHERE lower(provider_name) LIKE '%openrouter%' AND provider_key IS NULL;

UPDATE public.providers
SET provider_key = 'elevenlabs'
WHERE lower(provider_name) LIKE '%elevenlabs%' AND provider_key IS NULL;

UPDATE public.providers
SET provider_key = 'cloudflare_r2'
WHERE (lower(provider_name) LIKE '%cloudflare%' OR lower(provider_name) LIKE '%r2%') AND provider_key IS NULL;

UPDATE public.providers
SET provider_key = 'whisper'
WHERE lower(provider_name) LIKE '%whisper%' AND provider_key IS NULL;

UPDATE public.providers
SET provider_key = 'render_worker'
WHERE lower(provider_name) LIKE '%render%' AND provider_key IS NULL;

-- 3. Delete any custom providers that did not map to the 5 keys
DELETE FROM public.providers WHERE provider_key IS NULL;

-- 4. Deduplicate: Keep only the most recently updated record for each provider_key
DELETE FROM public.providers
WHERE id NOT IN (
    SELECT id
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY provider_key ORDER BY updated_at DESC) as rn
        FROM public.providers
    ) sub
    WHERE rn = 1
);

-- 5. Seed missing default providers if they don't exist
INSERT INTO public.providers (provider_type, provider_name, provider_key, is_active, health_status)
SELECT 'llm', 'OpenRouter', 'openrouter', true, 'unknown'
WHERE NOT EXISTS (SELECT 1 FROM public.providers WHERE provider_key = 'openrouter');

INSERT INTO public.providers (provider_type, provider_name, provider_key, is_active, health_status)
SELECT 'tts', 'ElevenLabs', 'elevenlabs', true, 'unknown'
WHERE NOT EXISTS (SELECT 1 FROM public.providers WHERE provider_key = 'elevenlabs');

INSERT INTO public.providers (provider_type, provider_name, provider_key, is_active, health_status)
SELECT 'storage', 'Cloudflare R2', 'cloudflare_r2', true, 'unknown'
WHERE NOT EXISTS (SELECT 1 FROM public.providers WHERE provider_key = 'cloudflare_r2');

INSERT INTO public.providers (provider_type, provider_name, provider_key, is_active, health_status)
SELECT 'subtitle', 'Whisper', 'whisper', true, 'unknown'
WHERE NOT EXISTS (SELECT 1 FROM public.providers WHERE provider_key = 'whisper');

INSERT INTO public.providers (provider_type, provider_name, provider_key, is_active, health_status)
SELECT 'render', 'Render Worker', 'render_worker', true, 'unknown'
WHERE NOT EXISTS (SELECT 1 FROM public.providers WHERE provider_key = 'render_worker');

-- 6. Make provider_key NOT NULL and UNIQUE
ALTER TABLE public.providers ALTER COLUMN provider_key SET NOT NULL;
ALTER TABLE public.providers ADD CONSTRAINT providers_provider_key_key UNIQUE (provider_key);

-- 7. (Optional) We can safely drop deleted_at if it's no longer used for soft deletes.
-- ALTER TABLE public.providers DROP COLUMN IF EXISTS deleted_at;
-- However, we keep it for now just in case other modules depend on the column's existence, 
-- but we simply won't use it in runtime logic anymore.
