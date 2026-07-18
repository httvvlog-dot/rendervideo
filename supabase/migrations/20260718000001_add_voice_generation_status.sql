-- Add voice_generation_status to script_sections
ALTER TABLE public.script_sections
ADD COLUMN IF NOT EXISTS voice_generation_status TEXT DEFAULT 'idle';

-- Index for querying status
CREATE INDEX IF NOT EXISTS idx_script_sections_voice_status ON public.script_sections(voice_generation_status);
