-- 1. Updates to existing tables
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS target_duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS timeline_version INTEGER DEFAULT 1;

ALTER TABLE public.project_media
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS duration FLOAT,
ADD COLUMN IF NOT EXISTS fps FLOAT,
ADD COLUMN IF NOT EXISTS checksum TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2. Create project_assets
CREATE TABLE IF NOT EXISTS public.project_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('IMAGE', 'VIDEO', 'AUDIO', 'STICKER', 'LOGO')),
    storage_key TEXT NOT NULL,
    duration FLOAT,
    size INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_project_assets_project_id ON public.project_assets(project_id);

-- 3. Create project_scenes
CREATE TABLE IF NOT EXISTS public.project_scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    media_id UUID REFERENCES public.project_media(id) ON DELETE SET NULL,
    
    name TEXT,
    enabled BOOLEAN DEFAULT true,
    locked BOOLEAN DEFAULT false,
    track_type TEXT DEFAULT 'VIDEO' CHECK (track_type IN ('VIDEO', 'CAPTION', 'VOICE', 'MUSIC')),
    track_index INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    duration FLOAT NOT NULL,
    
    crop_x FLOAT,
    crop_y FLOAT,
    crop_width FLOAT,
    crop_height FLOAT,
    
    zoom_scale FLOAT DEFAULT 1.0,
    pan_x FLOAT DEFAULT 0,
    pan_y FLOAT DEFAULT 0,
    rotation FLOAT DEFAULT 0,
    opacity FLOAT DEFAULT 1.0,
    
    blur FLOAT DEFAULT 0,
    brightness FLOAT DEFAULT 1.0,
    contrast FLOAT DEFAULT 1.0,
    saturation FLOAT DEFAULT 1.0,
    
    transition_type TEXT,
    transition_duration FLOAT DEFAULT 0,
    transition_easing TEXT DEFAULT 'linear',
    
    effect TEXT,
    effect_strength FLOAT DEFAULT 0,
    effect_speed FLOAT DEFAULT 1.0,
    
    caption TEXT,
    caption_style TEXT,
    caption_animation TEXT,
    caption_position TEXT,
    caption_color TEXT,
    caption_size TEXT,
    caption_font TEXT,
    
    voice_asset_id UUID REFERENCES public.project_assets(id) ON DELETE SET NULL,
    voice_start FLOAT,
    voice_end FLOAT,
    volume FLOAT DEFAULT 1.0,
    
    music_asset_id UUID REFERENCES public.project_assets(id) ON DELETE SET NULL,
    music_volume FLOAT DEFAULT 1.0,
    music_fade_in FLOAT DEFAULT 0,
    music_fade_out FLOAT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.project_scenes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_project_scenes_project_id ON public.project_scenes(project_id);

-- 4. Create render_jobs
CREATE TABLE IF NOT EXISTS public.render_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    engine TEXT,
    worker_id TEXT,
    machine_name TEXT,
    queue_position INTEGER,
    retry_count INTEGER DEFAULT 0,
    
    aspect_ratio TEXT DEFAULT '16:9',
    resolution TEXT DEFAULT '1080p',
    fps INTEGER DEFAULT 30,
    codec TEXT DEFAULT 'h264',
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress FLOAT DEFAULT 0,
    output_url TEXT,
    error_message TEXT,
    
    estimated_time FLOAT,
    elapsed_time FLOAT,
    
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_render_jobs_project_id ON public.render_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON public.render_jobs(status);
