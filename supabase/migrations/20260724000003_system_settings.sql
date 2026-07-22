BEGIN;

-- Add new enterprise columns to existing system_settings
ALTER TABLE public.system_settings 
    ADD COLUMN IF NOT EXISTS setting_group VARCHAR(50) DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Seed default settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_group, description) VALUES
('default_currency', 'VND', 'billing', 'Default currency for billing'),
('welcome_bonus', '500', 'billing', 'Default welcome bonus credits'),
('max_render_retry', '3', 'rendering', 'Max automated retries for render jobs'),
('default_pricing_profile', 'Standard', 'billing', 'Default pricing profile name')
ON CONFLICT (setting_key) DO UPDATE SET setting_group = EXCLUDED.setting_group;

COMMIT;
