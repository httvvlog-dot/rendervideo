-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists vector with schema extensions;

-- 1. PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.profiles enable row level security;

-- 2. SYSTEM_SETTINGS
create table public.system_settings (
  id uuid default gen_random_uuid() primary key,
  setting_key text unique not null,
  setting_value text not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.system_settings enable row level security;

-- 3. PROVIDERS
create table public.providers (
  id uuid default gen_random_uuid() primary key,
  provider_type text not null, -- llm, tts, storage, subtitle, image, youtube
  provider_name text not null,
  config_json jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.providers enable row level security;

-- 4. ENCRYPTED_SECRETS
create table public.encrypted_secrets (
  id uuid default gen_random_uuid() primary key,
  provider text not null,
  secret_name text not null,
  encrypted_value text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.encrypted_secrets enable row level security;

-- 5. TEMPLATES & PRESETS
create table public.prompt_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text,
  version integer default 1,
  is_active boolean default true,
  system_prompt text not null,
  user_prompt text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.prompt_templates enable row level security;

create table public.voice_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  version integer default 1,
  provider text not null,
  voice_id text not null,
  speed numeric default 1.0,
  pitch numeric default 0.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.voice_templates enable row level security;

create table public.render_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  width integer not null,
  height integer not null,
  fps integer default 30,
  transition text default 'fade',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.render_templates enable row level security;

create table public.render_presets (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  transition text default 'fade',
  zoom_speed numeric default 1.0,
  subtitle_style jsonb default '{}'::jsonb,
  background_music text,
  logo_enabled boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.render_presets enable row level security;

create table public.thumbnail_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  layout jsonb default '{}'::jsonb,
  font text,
  style jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.thumbnail_templates enable row level security;

-- 6. PROJECTS
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  topic text not null,
  language text default 'vi',
  voice_template_id uuid references public.voice_templates(id),
  prompt_template_id uuid references public.prompt_templates(id),
  render_template_id uuid references public.render_templates(id),
  render_preset_id uuid references public.render_presets(id),
  video_length integer default 10,
  status text default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.projects enable row level security;

-- 7. STORAGE & MEDIA
create table public.storage_files (
  id uuid default gen_random_uuid() primary key,
  provider text not null,
  bucket text not null,
  path text not null,
  mime_type text,
  size bigint,
  public_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.storage_files enable row level security;

create table public.media_assets (
  id uuid default gen_random_uuid() primary key,
  storage_file_id uuid references public.storage_files(id) on delete cascade not null,
  title text,
  category text,
  folder text,
  tags text[],
  keywords text[],
  embedding extensions.vector(1536), -- for Phase 2
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.media_assets enable row level security;

create table public.audio_assets (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  storage_file_id uuid references public.storage_files(id) on delete cascade not null,
  duration numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.audio_assets enable row level security;

create table public.music_assets (
  id uuid default gen_random_uuid() primary key,
  storage_file_id uuid references public.storage_files(id) on delete cascade not null,
  title text not null,
  category text,
  tags text[],
  duration numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.music_assets enable row level security;

-- 8. GENERATION PIPELINE (Research, Script, Scenes)
create table public.research_results (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  content text not null,
  sources jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.research_results enable row level security;

create table public.scripts (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  content text not null,
  word_count integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.scripts enable row level security;

create table public.scenes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  scene_order integer not null,
  title text,
  description text,
  duration numeric,
  keywords text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.scenes enable row level security;

create table public.scene_assets (
  id uuid default gen_random_uuid() primary key,
  scene_id uuid references public.scenes(id) on delete cascade not null,
  media_asset_id uuid references public.media_assets(id) on delete cascade not null,
  asset_type text not null,
  sort_order integer default 0
);
alter table public.scene_assets enable row level security;

-- 9. RENDERS & VERSIONS
create table public.renders (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  status text default 'pending',
  progress numeric default 0,
  video_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.renders enable row level security;

create table public.video_versions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  storage_file_id uuid references public.storage_files(id) on delete cascade not null,
  version integer not null,
  duration numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.video_versions enable row level security;

-- 10. WORKFLOW, JOBS & LOGS
create table public.workflow_executions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  current_step text not null,
  status text default 'in_progress',
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);
alter table public.workflow_executions enable row level security;

create table public.job_queue (
  id uuid default gen_random_uuid() primary key,
  job_type text not null,
  status text default 'pending',
  payload jsonb not null,
  attempts integer default 0,
  priority integer default 1,
  scheduled_at timestamp with time zone default timezone('utc'::text, now()),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.job_queue enable row level security;

create table public.usage_logs (
  id uuid default gen_random_uuid() primary key,
  provider text not null,
  tokens integer default 0,
  images integer default 0,
  audio_seconds numeric default 0,
  cost numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.usage_logs enable row level security;

create table public.provider_logs (
  id uuid default gen_random_uuid() primary key,
  provider text not null,
  status text not null,
  response_time numeric,
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.provider_logs enable row level security;

create table public.error_logs (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  job_id uuid references public.job_queue(id) on delete cascade,
  module text not null,
  error_message text not null,
  stack_trace text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.error_logs enable row level security;

create table public.prompt_executions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  provider text not null,
  model text not null,
  prompt text not null,
  response text,
  tokens integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.prompt_executions enable row level security;

create table public.storage_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  images_count integer default 0,
  videos_count integer default 0,
  audio_count integer default 0,
  storage_bytes bigint default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.storage_usage enable row level security;

-- Set up basic RLS policies
-- Note: As a multi-tenant app, users can only access their own data. Admins can access everything.
-- This requires robust policy definitions in a real environment.
