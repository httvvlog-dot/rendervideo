-- Add asset_type to project_media and backfill safely based on mime_type
ALTER TABLE public.project_media ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'unknown';

-- Backfill existing rows
UPDATE public.project_media
SET asset_type = CASE
  WHEN mime_type LIKE 'image/%' THEN 'image'
  WHEN mime_type LIKE 'audio/%' THEN 'voice' -- Note: we assume existing audio is voice, but we'll monitor if this is correct. Currently no audio uploads exist yet.
  WHEN mime_type LIKE 'video/%' THEN 'video'
  ELSE 'unknown'
END;

-- Add duration to project_media (for audio/video)
ALTER TABLE public.project_media ADD COLUMN duration_ms BIGINT NULL;

-- Add voice fields to script_sections
ALTER TABLE public.script_sections ADD COLUMN voice_media_id UUID NULL REFERENCES public.project_media(id) ON DELETE SET NULL;
ALTER TABLE public.script_sections ADD COLUMN voice_duration_ms BIGINT NULL;

-- Ensure timeline RPC can update the new project_scenes structure
-- Wait, the user didn't ask to add a column to project_scenes, but we must make sure syncTimelineToVoice preserves section_id.
