-- Create voice_presets table
CREATE TABLE IF NOT EXISTS public.voice_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(255) DEFAULT 'elevenlabs',
    voice_id TEXT UNIQUE NOT NULL,
    name TEXT,
    display_name TEXT,
    description TEXT,
    gender TEXT,
    age TEXT,
    accent TEXT,
    category TEXT,
    preview_url TEXT,
    labels_json JSONB,
    settings_json JSONB,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_voice_presets_voice_id ON public.voice_presets(voice_id);
CREATE INDEX IF NOT EXISTS idx_voice_presets_is_active ON public.voice_presets(is_active);
CREATE INDEX IF NOT EXISTS idx_voice_presets_sort_order ON public.voice_presets(sort_order);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_voice_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voice_presets_updated_at_trigger
    BEFORE UPDATE ON public.voice_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_presets_updated_at();

-- Add default_voice_preset_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_voice_preset_id UUID REFERENCES public.voice_presets(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.voice_presets ENABLE ROW LEVEL SECURITY;

-- Policies for voice_presets
-- Read access to all authenticated users for active voices
CREATE POLICY "Users can view active voice presets"
ON public.voice_presets
FOR SELECT
TO authenticated
USING (is_active = true);

-- Service role has full access (bypasses RLS anyway, but good to be explicit if using specific roles)
CREATE POLICY "Service role has full access to voice presets"
ON public.voice_presets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admin users (if applicable based on existing system) can view all and edit
CREATE POLICY "Admins have full access to voice presets"
ON public.voice_presets
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
