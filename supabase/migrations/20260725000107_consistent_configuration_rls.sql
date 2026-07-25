-- Migration: Consistent Configuration RLS
-- Ensures that all system configuration tables have consistent RLS policies:
-- 1. RLS is ENABLED.
-- 2. Authenticated users can SELECT (read-only).
-- 3. Admins can perform ALL operations.

DO $$
BEGIN
    -- ai_capabilities
    ALTER TABLE public.ai_capabilities ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_capabilities_read_authenticated' AND tablename = 'ai_capabilities') THEN
        CREATE POLICY "ai_capabilities_read_authenticated" ON public.ai_capabilities FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_capabilities_all_admin' AND tablename = 'ai_capabilities') THEN
        CREATE POLICY "ai_capabilities_all_admin" ON public.ai_capabilities FOR ALL TO public USING (is_admin());
    END IF;

    -- provider_model_pricing
    ALTER TABLE public.provider_model_pricing ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'provider_model_pricing_read_authenticated' AND tablename = 'provider_model_pricing') THEN
        CREATE POLICY "provider_model_pricing_read_authenticated" ON public.provider_model_pricing FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'provider_model_pricing_all_admin' AND tablename = 'provider_model_pricing') THEN
        CREATE POLICY "provider_model_pricing_all_admin" ON public.provider_model_pricing FOR ALL TO public USING (is_admin());
    END IF;

    -- credit_rules
    ALTER TABLE public.credit_rules ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'credit_rules_read_authenticated' AND tablename = 'credit_rules') THEN
        CREATE POLICY "credit_rules_read_authenticated" ON public.credit_rules FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'credit_rules_all_admin' AND tablename = 'credit_rules') THEN
        CREATE POLICY "credit_rules_all_admin" ON public.credit_rules FOR ALL TO public USING (is_admin());
    END IF;

END $$;
