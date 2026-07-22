BEGIN;

CREATE TABLE IF NOT EXISTS public.system_features (
    feature_name VARCHAR(100) PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_features ENABLE ROW LEVEL SECURITY;

INSERT INTO public.system_features (feature_name, is_enabled, description) VALUES
('multi_tenant', false, 'Enable B2B multi-tenant organization capabilities'),
('pricing_profiles', true, 'Enable tiered dynamic pricing profiles'),
('notifications', true, 'Enable user in-app notifications'),
('ai_usage_logs', true, 'Enable unified AI telemetry')
ON CONFLICT (feature_name) DO UPDATE 
SET description = EXCLUDED.description;

COMMIT;
