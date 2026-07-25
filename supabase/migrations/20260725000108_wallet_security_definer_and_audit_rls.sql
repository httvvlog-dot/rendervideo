-- Migration: Wallet RPC Security Definer & Audit Log RLS

-- 1. Ensure Wallet RPCs can bypass RLS for administrative actions (like deducting balance)
ALTER FUNCTION public.reserve_credits(UUID, BIGINT, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT, JSONB, INT) SECURITY DEFINER;
ALTER FUNCTION public.commit_credits(UUID, JSONB, DECIMAL, VARCHAR, VARCHAR, UUID) SECURITY DEFINER;
ALTER FUNCTION public.release_credits(UUID, TEXT) SECURITY DEFINER;

-- 2. Add RLS Policy for billing_audit_logs
ALTER TABLE public.billing_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own audit logs' AND tablename = 'billing_audit_logs') THEN
        CREATE POLICY "Users can insert their own audit logs" ON public.billing_audit_logs
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own audit logs' AND tablename = 'billing_audit_logs') THEN
        CREATE POLICY "Users can view their own audit logs" ON public.billing_audit_logs
        FOR SELECT TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;
