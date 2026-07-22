BEGIN;

-- ADD CURRENCY TO ORDERS AND PAYMENTS
ALTER TABLE public.payment_orders 
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'VND',
    ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1.0;

-- PRICING PROFILES
CREATE TABLE IF NOT EXISTS public.pricing_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.pricing_profiles ENABLE ROW LEVEL SECURITY;

-- Insert default pricing profile
INSERT INTO public.pricing_profiles (name, description, is_default) 
VALUES ('Standard', 'Default pricing profile for all new users', true)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.credit_rules 
    ADD COLUMN IF NOT EXISTS pricing_profile_id UUID REFERENCES public.pricing_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.provider_model_pricing 
    ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ;

COMMIT;
