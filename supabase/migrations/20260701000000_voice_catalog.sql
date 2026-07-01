-- Create voice_catalog table for ElevenLabs and other TTS providers

create table public.voice_catalog (
  id uuid default gen_random_uuid() primary key,
  provider text not null, -- e.g., 'ElevenLabs'
  voice_id text not null unique,
  name text not null,
  category text,
  labels jsonb,
  preview_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.voice_catalog enable row level security;

-- Policies
create policy "Anyone can view voice catalog"
  on public.voice_catalog for select
  using ( true );

create policy "Admins can manage voice catalog"
  on public.voice_catalog for all
  using ( public.is_admin() );
