-- 1. Add version and drop aspect_ratio from export_presets
ALTER TABLE public.export_presets
  ADD COLUMN version INTEGER DEFAULT 1,
  DROP COLUMN aspect_ratio;

-- 2. Add preset_snapshot to render_jobs
ALTER TABLE public.render_jobs
  ADD COLUMN preset_snapshot JSONB;

-- 3. Add billing_policy_version to system_settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('billing_policy_version', '1.0', 'Current version of the billing policy for rendering')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
