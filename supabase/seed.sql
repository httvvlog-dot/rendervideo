-- SEED DATA for AI YouTube Video Generator



-- 2. Providers Seed
insert into public.providers (provider_key, provider_type, provider_name)
values
  ('openrouter', 'llm', 'OpenRouter'),
  ('elevenlabs', 'tts', 'ElevenLabs'),
  ('whisper', 'subtitle', 'Whisper'),
  ('cloudflare_r2', 'storage', 'Cloudflare R2')
on conflict (provider_key) do nothing;

-- 3. System Settings Seed
insert into public.system_settings (setting_key, setting_value, description)
values
  ('default_video_length', '10', 'Default length of generated videos in minutes'),
  ('default_language', 'vi', 'Default language for generation'),
  ('default_render_template', 'youtube-long', 'Default template for Remotion'),
  ('default_voice_template', 'narrator-male', 'Default voice profile'),
  ('billing_schema_version', '2', 'Version of the billing schema')
on conflict (setting_key) do update set setting_value = excluded.setting_value;

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



-- 8. Provider Model Pricing & Credit Rules Seed
-- Insert Pricing
INSERT INTO public.provider_model_pricing (provider, model, api_cost, input_cost, output_cost, currency, pricing_type, version, unit, supports_usage_reporting, billing_strategy)
VALUES 
  ('openrouter', 'deepseek/deepseek-v4-flash', 0, 0.14, 0.28, 'USD', 'per_unit', 1, '1M tokens', true, 'PER_TOKEN'),
  ('openrouter', 'openai/gpt-4o-mini', 0, 0.15, 0.60, 'USD', 'per_unit', 1, '1M tokens', true, 'PER_TOKEN'),
  ('elevenlabs', 'eleven_multilingual_v2', 0.03, 0, 0, 'USD', 'per_unit', 1, '1000 characters', false, 'PER_CHARACTER')
ON CONFLICT (provider, model, version) 
DO UPDATE SET 
  api_cost = EXCLUDED.api_cost,
  input_cost = EXCLUDED.input_cost,
  output_cost = EXCLUDED.output_cost,
  unit = EXCLUDED.unit,
  supports_usage_reporting = EXCLUDED.supports_usage_reporting,
  billing_strategy = EXCLUDED.billing_strategy;

-- 9. AI Capabilities Registry
INSERT INTO public.ai_capabilities (feature, provider, model, is_active, is_default, priority)
VALUES 
  ('SCRIPT_GENERATION', 'openrouter', 'deepseek/deepseek-v4-flash', true, true, 10),
  ('SCRIPT_GENERATION', 'openrouter', 'openai/gpt-4o-mini', true, false, 5),
  ('VOICE_GENERATION', 'elevenlabs', 'eleven_multilingual_v2', true, true, 10)
ON CONFLICT (feature, provider, model) 
DO UPDATE SET 
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  priority = EXCLUDED.priority;

-- 10. Insert Rules (Using Subqueries to avoid UUIDs)
INSERT INTO public.credit_rules (feature, provider_model_pricing_id, credit_cost, version)
SELECT 'SCRIPT_GENERATION', id, 1, 1 
FROM public.provider_model_pricing 
WHERE provider='openrouter' AND model='deepseek/deepseek-v4-flash' AND version=1
ON CONFLICT (feature, provider_model_pricing_id, version) DO UPDATE SET credit_cost = EXCLUDED.credit_cost;

INSERT INTO public.credit_rules (feature, provider_model_pricing_id, credit_cost, version)
SELECT 'SCRIPT_GENERATION', id, 1, 1 
FROM public.provider_model_pricing 
WHERE provider='openrouter' AND model='openai/gpt-4o-mini' AND version=1
ON CONFLICT (feature, provider_model_pricing_id, version) DO UPDATE SET credit_cost = EXCLUDED.credit_cost;

INSERT INTO public.credit_rules (feature, provider_model_pricing_id, credit_cost, version)
SELECT 'VOICE_GENERATION', id, 1, 1 
FROM public.provider_model_pricing 
WHERE provider='elevenlabs' AND model='eleven_multilingual_v2' AND version=1
ON CONFLICT (feature, provider_model_pricing_id, version) DO UPDATE SET credit_cost = EXCLUDED.credit_cost;
