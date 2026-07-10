-- 1. Create render_presets table
DROP TABLE IF EXISTS public.render_presets CASCADE;
CREATE TABLE public.render_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    fps INTEGER NOT NULL DEFAULT 30,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.render_presets ENABLE ROW LEVEL SECURITY;

-- Default presets
INSERT INTO public.render_presets (name, width, height, fps, description) VALUES
('TikTok / Reels / Shorts', 1080, 1920, 30, 'Vertical 9:16 format'),
('YouTube / TV', 1920, 1080, 30, 'Horizontal 16:9 format'),
('Instagram / Facebook Post', 1080, 1080, 30, 'Square 1:1 format')
ON CONFLICT DO NOTHING;

-- 2. Update projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS timeline_hash TEXT,
ADD COLUMN IF NOT EXISTS timeline_json JSONB;

-- 3. Update project_scenes table
ALTER TABLE public.project_scenes
ADD COLUMN IF NOT EXISTS easing TEXT DEFAULT 'linear',
ADD COLUMN IF NOT EXISTS curve TEXT,
ADD COLUMN IF NOT EXISTS anchor TEXT DEFAULT 'Center',
ADD COLUMN IF NOT EXISTS start_scale FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS end_scale FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS start_x FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS end_x FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS start_y FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS end_y FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS transition_parameters JSONB DEFAULT '{}'::jsonb;

-- 4. Update render_jobs table
-- First, drop the old constraint safely
ALTER TABLE public.render_jobs DROP CONSTRAINT IF EXISTS render_jobs_status_check;

-- Add new columns
ALTER TABLE public.render_jobs
ADD COLUMN IF NOT EXISTS timeline_snapshot JSONB,
ADD COLUMN IF NOT EXISTS current_fps FLOAT,
ADD COLUMN IF NOT EXISTS eta FLOAT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS preview_url TEXT,
ADD COLUMN IF NOT EXISTS size BIGINT,
ADD COLUMN IF NOT EXISTS duration FLOAT,
ADD COLUMN IF NOT EXISTS bitrate INTEGER;

-- Re-add the check constraint with expanded Adobe-style enum
ALTER TABLE public.render_jobs 
ADD CONSTRAINT render_jobs_status_check 
CHECK (status IN (
    'pending', 
    'queued', 
    'preparing', 
    'downloading',
    'rendering', 
    'encoding', 
    'uploading', 
    'completed', 
    'failed', 
    'cancelled'
));
