-- Subscription Management Architecture

-- 1. Extend subscription_status ENUM
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'PENDING';

-- 2. Create `plans` table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed basic plans
INSERT INTO public.plans (code, name, priority)
VALUES 
    ('FREE', 'Free Plan', 0),
    ('PRO', 'Pro Plan', 10),
    ('VIP', 'VIP Plan', 20)
ON CONFLICT (code) DO NOTHING;

-- 3. Migrate `subscriptions` table
-- Add new columns
ALTER TABLE public.subscriptions 
    ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'MANUAL',
    ADD COLUMN IF NOT EXISTS new_plan_id UUID REFERENCES public.plans(id);

-- Update new_plan_id based on old varchar plan_id
UPDATE public.subscriptions s
SET new_plan_id = p.id
FROM public.plans p
WHERE s.plan_id = p.code;

-- Drop old plan_id column and rename new_plan_id to plan_id
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS plan_id;
ALTER TABLE public.subscriptions RENAME COLUMN new_plan_id TO plan_id;
ALTER TABLE public.subscriptions ALTER COLUMN plan_id SET NOT NULL;

-- 4. Migrate `ai_plan_profiles` to use plan_id (UUID) instead of plan_key (VARCHAR)
ALTER TABLE public.ai_plan_profiles
    ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id);

UPDATE public.ai_plan_profiles ap
SET plan_id = p.id
FROM public.plans p
WHERE ap.plan_key = p.code;

-- Note: We will keep plan_key for backward compatibility temporarily, but plan_id is the new FK.

-- 5. Update get_admin_users_list RPC
DROP FUNCTION IF EXISTS public.get_admin_users_list(text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_admin_users_list(
    p_search_query TEXT DEFAULT '',
    p_role TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    status VARCHAR,
    is_verified BOOLEAN,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    balance_credits BIGINT,
    lifetime_used BIGINT,
    lifetime_purchased BIGINT,
    total_projects BIGINT,
    plan_code TEXT,
    plan_status TEXT,
    ai_credits INT,
    total_count BIGINT
) AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Security Check
    SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
    IF v_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    WITH FilteredUsers AS (
        SELECT 
            p.id, p.email, p.full_name, p.role, p.status, p.is_verified, p.last_login, p.created_at
        FROM public.profiles p
        WHERE 
            p.deleted_at IS NULL
            AND (p_search_query = '' OR 
                 p.email ILIKE '%' || p_search_query || '%' OR 
                 p.full_name ILIKE '%' || p_search_query || '%' OR
                 p.phone ILIKE '%' || p_search_query || '%' OR
                 p.company ILIKE '%' || p_search_query || '%')
            AND (p_role IS NULL OR p.role = p_role)
            AND (p_status IS NULL OR p.status = p_status)
    ),
    TotalCount AS (
        SELECT COUNT(*) as cnt FROM FilteredUsers
    )
    SELECT 
        fu.id as user_id,
        fu.email,
        fu.full_name,
        fu.role,
        fu.status,
        fu.is_verified,
        fu.last_login,
        fu.created_at,
        COALESCE(w.balance_credits, 0) as balance_credits,
        COALESCE(w.lifetime_used, 0) as lifetime_used,
        COALESCE(w.total_purchased_credits, 0) as lifetime_purchased,
        (SELECT COUNT(*) FROM public.projects pr WHERE pr.user_id = fu.id AND pr.deleted_at IS NULL) as total_projects,
        pl.code::TEXT as plan_code,
        sub.status::TEXT as plan_status,
        COALESCE(sub.monthly_credit, 0) as ai_credits,
        tc.cnt as total_count
    FROM FilteredUsers fu
    CROSS JOIN TotalCount tc
    LEFT JOIN public.wallets w ON w.user_id = fu.id
    LEFT JOIN LATERAL (
        SELECT s.plan_id, s.status, s.monthly_credit 
        FROM public.subscriptions s 
        WHERE s.user_id = fu.id AND s.status = 'ACTIVE'
        ORDER BY s.created_at DESC LIMIT 1
    ) sub ON true
    LEFT JOIN public.plans pl ON sub.plan_id = pl.id
    ORDER BY fu.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 6. RPC for Transactional Plan Change
CREATE OR REPLACE FUNCTION public.admin_change_subscription_plan(
    p_user_id UUID,
    p_new_plan_id UUID,
    p_admin_id UUID,
    p_reason TEXT,
    p_source TEXT
)
RETURNS JSONB AS \$\$
DECLARE
    v_old_plan_code VARCHAR;
    v_new_plan_code VARCHAR;
    v_new_monthly_credit INT;
BEGIN
    -- Security Check
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Validate User
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Validate New Plan
    SELECT code, priority * 100 INTO v_new_plan_code, v_new_monthly_credit
    FROM public.plans WHERE id = p_new_plan_id AND is_active = true;

    IF v_new_plan_code IS NULL THEN
        RAISE EXCEPTION 'Plan is invalid or inactive';
    END IF;

    -- Get Old Plan Code for logging
    SELECT pl.code INTO v_old_plan_code
    FROM public.subscriptions s
    JOIN public.plans pl ON s.plan_id = pl.id
    WHERE s.user_id = p_user_id AND s.status = 'ACTIVE'
    ORDER BY s.created_at DESC LIMIT 1;

    -- Expire current subscriptions
    UPDATE public.subscriptions
    SET status = 'EXPIRED', expires_at = NOW()
    WHERE user_id = p_user_id AND status = 'ACTIVE';

    -- Insert new subscription
    INSERT INTO public.subscriptions (
        user_id, plan_id, status, monthly_credit, starts_at, source
    ) VALUES (
        p_user_id, p_new_plan_id, 'ACTIVE', v_new_monthly_credit, NOW(), p_source
    );

    -- Audit Log
    INSERT INTO public.admin_audit_logs (
        admin_id, target_user_id, action, details
    ) VALUES (
        COALESCE(p_admin_id, auth.uid()),
        p_user_id,
        'CHANGE_PLAN',
        jsonb_build_object(
            'from_plan', COALESCE(v_old_plan_code, 'NONE'),
            'to_plan', v_new_plan_code,
            'reason', p_reason,
            'source', p_source
        )
    );

    RETURN jsonb_build_object('success', true, 'new_plan', v_new_plan_code);
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;
