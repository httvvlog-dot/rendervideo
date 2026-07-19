-- 1. Create export_presets table
CREATE TABLE public.export_presets (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  user_id uuid references public.profiles(id) on delete cascade,
  is_system_preset boolean default false,
  is_default boolean default false,
  display_order integer default 0,
  
  aspect_ratio text default '9:16',
  width integer default 1080,
  height integer default 1920,
  fps integer default 30,
  quality text default 'Standard',
  codec text default 'h264',
  audio_sample_rate integer default 48000,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.export_presets ENABLE ROW LEVEL SECURITY;

-- Allow users to view system presets or their own presets
CREATE POLICY "Users can view system or own export presets"
ON public.export_presets FOR SELECT
USING (is_system_preset = true OR user_id = auth.uid());

CREATE POLICY "Users can manage own export presets"
ON public.export_presets FOR ALL
USING (user_id = auth.uid());

-- 2. Add export_preset_id to projects
ALTER TABLE public.projects 
ADD COLUMN export_preset_id uuid references public.export_presets(id);

-- 3. Seed basic system settings for render cost
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('render_credit_720p', '3', 'Cost in credits to render a 720p video'),
  ('render_credit_1080p', '5', 'Cost in credits to render a 1080p video'),
  ('render_credit_1440p', '8', 'Cost in credits to render a 1440p video'),
  ('render_credit_4k', '15', 'Cost in credits to render a 4K video')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 4. Seed basic export presets
INSERT INTO public.export_presets (id, name, is_system_preset, is_default, display_order, aspect_ratio, width, height, fps, quality, codec)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'TikTok / Shorts (1080p)', true, true, 10, '9:16', 1080, 1920, 30, 'Standard', 'h264'),
  ('22222222-2222-2222-2222-222222222222', 'Draft Preview (720p)', true, false, 20, '9:16', 720, 1280, 30, 'Draft', 'h264'),
  ('33333333-3333-3333-3333-333333333333', 'YouTube (1080p)', true, false, 30, '16:9', 1920, 1080, 30, 'Standard', 'h264'),
  ('44444444-4444-4444-4444-444444444444', 'Instagram Square (1:1)', true, false, 40, '1:1', 1080, 1080, 30, 'Standard', 'h264')
ON CONFLICT DO NOTHING;
