-- Add aspect_ratio, canvas_width, canvas_height to projects table
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS aspect_ratio text NOT NULL DEFAULT '9:16',
  ADD COLUMN IF NOT EXISTS canvas_width integer NOT NULL DEFAULT 1080,
  ADD COLUMN IF NOT EXISTS canvas_height integer NOT NULL DEFAULT 1920;

-- Optional: Update existing records explicitly (though DEFAULT handles future reads)
UPDATE public.projects 
SET 
  aspect_ratio = '9:16',
  canvas_width = 1080,
  canvas_height = 1920
WHERE aspect_ratio IS NULL;
