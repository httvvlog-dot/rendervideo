-- SEED DATA for AI YouTube Video Generator

-- Note: In a real Supabase Auth setup, creating users requires inserting into auth.users.
-- Since this is a seed script for local dev, we insert a mock admin user.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000000', 'acc792003@gmail.com') on conflict do nothing;

insert into public.profiles (id, email, full_name, role)
values ('00000000-0000-0000-0000-000000000000', 'acc792003@gmail.com', 'System Admin', 'admin')
on conflict do nothing;

-- 2. Providers Seed
insert into public.providers (provider_type, provider_name, config_json, is_active)
values
  ('llm', 'OpenRouter', '{"default_model": "google/gemini-2.5-flash", "fallback_model": "deepseek/deepseek-chat-v3"}'::jsonb, true),
  ('tts', 'ElevenLabs', '{"default_voice_id": "pNInz6obpgDQGcFmaJcg"}'::jsonb, true),
  ('subtitle', 'Whisper', '{"model": "whisper-1"}'::jsonb, true),
  ('storage', 'Cloudflare R2', '{"bucket": "media-library"}'::jsonb, true)
on conflict do nothing;

-- 3. System Settings Seed
insert into public.system_settings (setting_key, setting_value, description)
values
  ('default_video_length', '10', 'Default length of generated videos in minutes'),
  ('default_language', 'vi', 'Default language for generation'),
  ('default_render_template', 'youtube-long', 'Default template for Remotion'),
  ('default_voice_template', 'narrator-male', 'Default voice profile')
on conflict do nothing;

-- 4. Prompt Templates Seed
insert into public.prompt_templates (name, category, version, is_active, system_prompt, user_prompt)
values
  ('Mystery v1', 'mystery', 1, true, 'You are an expert documentary scriptwriter specialized in mysterious events.', 'Write a script about {topic}'),
  ('History v1', 'history', 1, true, 'You are an expert history documentary writer.', 'Write a historical breakdown of {topic}'),
  ('Space v1', 'space', 1, true, 'You are a space and astronomy scriptwriter.', 'Explain the universe concept: {topic}')
on conflict do nothing;

-- 5. Voice Templates Seed
insert into public.voice_templates (name, version, provider, voice_id, speed, pitch)
values
  ('Narrator Male', 1, 'ElevenLabs', 'pNInz6obpgDQGcFmaJcg', 1.0, 0.0),
  ('Narrator Female', 1, 'ElevenLabs', 'EXAVITQu4vr4xnSDxMaL', 1.0, 0.0)
on conflict do nothing;

-- 6. Render Templates Seed
insert into public.render_templates (name, width, height, fps, transition)
values
  ('YouTube Long Form', 1920, 1080, 30, 'fade'),
  ('YouTube Shorts', 1080, 1920, 30, 'fade')
on conflict do nothing;

-- 7. Render Presets Seed
insert into public.render_presets (name, transition, zoom_speed, subtitle_style, logo_enabled)
values
  ('Mystery Dark', 'fade', 1.2, '{"color": "#FFFFFF", "background": "#000000"}'::jsonb, false),
  ('Space Cinematic', 'zoom_in', 1.1, '{"color": "#FFFFFF", "background": "transparent"}'::jsonb, true)
on conflict do nothing;
