-- 1. Create Audit Logs table
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.audit_logs enable row level security;

-- 2. Add Updated_at Trigger Function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers to tables that have updated_at columns
create trigger handle_updated_at_providers before update on public.providers
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at_system_settings before update on public.system_settings
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at_encrypted_secrets before update on public.encrypted_secrets
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at_storage_usage before update on public.storage_usage
  for each row execute procedure public.handle_updated_at();

-- 3. Add Indexes for Foreign Keys to ensure CASCADE deletes are fast
create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_voice_template_id on public.projects(voice_template_id);
create index idx_projects_prompt_template_id on public.projects(prompt_template_id);
create index idx_projects_render_template_id on public.projects(render_template_id);
create index idx_projects_render_preset_id on public.projects(render_preset_id);

create index idx_media_assets_storage_file_id on public.media_assets(storage_file_id);
create index idx_audio_assets_project_id on public.audio_assets(project_id);
create index idx_audio_assets_storage_file_id on public.audio_assets(storage_file_id);
create index idx_music_assets_storage_file_id on public.music_assets(storage_file_id);

create index idx_research_results_project_id on public.research_results(project_id);
create index idx_scripts_project_id on public.scripts(project_id);
create index idx_scenes_project_id on public.scenes(project_id);

create index idx_scene_assets_scene_id on public.scene_assets(scene_id);
create index idx_scene_assets_media_asset_id on public.scene_assets(media_asset_id);

create index idx_renders_project_id on public.renders(project_id);
create index idx_video_versions_project_id on public.video_versions(project_id);
create index idx_video_versions_storage_file_id on public.video_versions(storage_file_id);

create index idx_workflow_executions_project_id on public.workflow_executions(project_id);

create index idx_error_logs_project_id on public.error_logs(project_id);
create index idx_error_logs_job_id on public.error_logs(job_id);

create index idx_prompt_executions_project_id on public.prompt_executions(project_id);

create index idx_storage_usage_user_id on public.storage_usage(user_id);

create index idx_audit_logs_user_id on public.audit_logs(user_id);
