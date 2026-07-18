-- Create provider_models table
CREATE TABLE IF NOT EXISTS public.provider_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(255) NOT NULL,
    model_id TEXT NOT NULL,
    name TEXT,
    description TEXT,
    supports_tts BOOLEAN DEFAULT true,
    supports_sts BOOLEAN DEFAULT false,
    supports_streaming BOOLEAN DEFAULT false,
    supports_language_code BOOLEAN DEFAULT false,
    is_deprecated BOOLEAN DEFAULT false,
    max_characters INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, model_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_provider_models_provider ON public.provider_models(provider);
CREATE INDEX IF NOT EXISTS idx_provider_models_is_active ON public.provider_models(is_active);

-- Add updated_at trigger for provider_models
CREATE OR REPLACE FUNCTION update_provider_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_models_updated_at_trigger
    BEFORE UPDATE ON public.provider_models
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_models_updated_at();

-- Add RLS to provider_models
ALTER TABLE public.provider_models ENABLE ROW LEVEL SECURITY;

-- Read access to all authenticated users for active models
CREATE POLICY "Users can view active provider models"
ON public.provider_models
FOR SELECT
TO authenticated
USING (is_active = true);

-- Service role has full access
CREATE POLICY "Service role has full access to provider models"
ON public.provider_models
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can manage models
CREATE POLICY "Admins have full access to provider models"
ON public.provider_models
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Add model_id to voice_presets
ALTER TABLE public.voice_presets 
ADD COLUMN IF NOT EXISTS model_id TEXT DEFAULT NULL;
