-- Sprint 2B Schema Upgrades

-- 1. Audit Logs (Already created in migration 20260624000001_audit_logs_indexes.sql)
-- We just ensure RLS policy exists if it was missed
create policy "Admins can view audit logs"
  on public.audit_logs for select
  using ( public.is_admin() );

-- 2. Providers Upgrade
alter table public.providers
  add column is_default boolean default false,
  add column priority integer default 0,
  add column health_status text default 'unknown' check (health_status in ('healthy', 'warning', 'offline', 'unknown')),
  add column last_checked_at timestamp with time zone;

-- 3. Prompt Templates Upgrade
alter table public.prompt_templates
  add column language text,
  add column description text,
  add column temperature numeric default 0.7,
  add column max_tokens integer default 2000,
  add column is_archived boolean default false;

-- 4. Voice Templates Upgrade
alter table public.voice_templates
  add column preview_url text,
  add column language text,
  add column gender text check (gender in ('male', 'female', 'neutral', 'unknown')) default 'unknown',
  add column is_default boolean default false,
  add column is_archived boolean default false;

-- 5. Render Templates Upgrade
alter table public.render_templates
  add column transition text,
  add column subtitle_style jsonb,
  add column ken_burns boolean default false,
  add column zoom_speed numeric,
  add column background_music text,
  add column logo_watermark boolean default false,
  add column outro text,
  add column is_default boolean default false,
  add column is_archived boolean default false;

-- 6. System Settings Upgrade
alter table public.system_settings
  add column category text default 'General',
  add column data_type text default 'text' check (data_type in ('text', 'number', 'boolean', 'json', 'password')),
  add column validation_rules jsonb;

-- Note: We only add columns with DEFAULT if they are NOT NULL logically, 
-- otherwise we leave them NULLABLE to prevent breaking existing rows.
