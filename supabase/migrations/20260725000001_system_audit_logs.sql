-- Migration: System Audit Logs
-- Tracks system-level administrative actions like role changes, suspensions, etc.

CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID, -- Optional, if action targets a user
    target_email TEXT,   -- Optional, if action targets a user
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    executor TEXT NOT NULL, -- Email or CLI signature of the person running the script
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups by user or action
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_target_user ON public.system_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_action ON public.system_audit_logs(action);

-- Enable RLS
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admins can view system audit logs
CREATE POLICY "Super Admins can view system audit logs"
    ON public.system_audit_logs
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'super_admin'
        )
    );

-- Logs are immutable, no update or delete allowed (insert usually done via service role)
