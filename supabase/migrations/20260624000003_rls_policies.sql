-- RLS Policies for Core Tables

-- 1. Profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- To allow admins to view all profiles, we can use a security definer function to check role, 
-- or simply rely on the service_role key for admin API routes. 
-- For now, we will add a policy that allows admins to select all profiles using a subquery.
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- 2. System Settings
-- System settings should be readable by all authenticated users
create policy "System settings are viewable by everyone"
  on public.system_settings for select
  to authenticated
  using ( true );

-- 3. Providers
-- Providers should be readable by all authenticated users
create policy "Providers are viewable by everyone"
  on public.providers for select
  to authenticated
  using ( true );

-- 4. Prompt, Voice, Render Templates
create policy "Templates are viewable by everyone"
  on public.prompt_templates for select to authenticated using ( true );

create policy "Voice templates are viewable by everyone"
  on public.voice_templates for select to authenticated using ( true );

create policy "Render templates are viewable by everyone"
  on public.render_templates for select to authenticated using ( true );

create policy "Render presets are viewable by everyone"
  on public.render_presets for select to authenticated using ( true );

-- 5. Projects
create policy "Users can view own projects"
  on public.projects for select using ( auth.uid() = user_id );

create policy "Users can insert own projects"
  on public.projects for insert with check ( auth.uid() = user_id );

create policy "Users can update own projects"
  on public.projects for update using ( auth.uid() = user_id );

create policy "Users can delete own projects"
  on public.projects for delete using ( auth.uid() = user_id );
