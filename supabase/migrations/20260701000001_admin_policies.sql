-- Add missing admin management policies for configuration tables

create policy "Admins can manage providers"
  on public.providers for all
  using ( public.is_admin() );

create policy "Admins can manage system_settings"
  on public.system_settings for all
  using ( public.is_admin() );

create policy "Admins can manage encrypted_secrets"
  on public.encrypted_secrets for all
  using ( public.is_admin() );

create policy "Admins can manage prompt_templates"
  on public.prompt_templates for all
  using ( public.is_admin() );

create policy "Admins can manage voice_templates"
  on public.voice_templates for all
  using ( public.is_admin() );

create policy "Admins can manage render_templates"
  on public.render_templates for all
  using ( public.is_admin() );

create policy "Admins can manage render_presets"
  on public.render_presets for all
  using ( public.is_admin() );
