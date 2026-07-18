-- Add generation_metadata column to project_media for storing TTS snapshots
ALTER TABLE public.project_media
ADD COLUMN IF NOT EXISTS generation_metadata JSONB;
