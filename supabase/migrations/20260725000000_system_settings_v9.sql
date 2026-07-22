BEGIN;

-- 1. Restore profiles.permissions (Do not drop during transition)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- 2. Extend system_settings with new columns
ALTER TABLE public.system_settings 
    ADD COLUMN IF NOT EXISTS value_type VARCHAR(20) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
    
-- (description already existed in the original init_schema, but let's ensure it's there if missing)
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Update existing records with value_type
UPDATE public.system_settings SET value_type = 'string' WHERE setting_key = 'default_currency';
UPDATE public.system_settings SET value_type = 'number' WHERE setting_key = 'welcome_bonus';
UPDATE public.system_settings SET value_type = 'number' WHERE setting_key = 'max_render_retry';
UPDATE public.system_settings SET value_type = 'string' WHERE setting_key = 'default_pricing_profile';

COMMIT;
