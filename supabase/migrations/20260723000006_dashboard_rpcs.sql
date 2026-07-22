BEGIN;

-- GLOBAL STATISTICS RPC
CREATE OR REPLACE FUNCTION public.get_admin_global_statistics()
RETURNS JSONB AS $$
DECLARE
    v_role TEXT;
    v_revenue_total BIGINT := 0;
    v_credits_sold BIGINT := 0;
    v_credits_used BIGINT := 0;
    v_provider_cost_usd DECIMAL(10, 4) := 0;
    v_active_users INT := 0;
    v_total_projects INT := 0;
    v_rendering_jobs INT := 0;
    v_failed_jobs INT := 0;
    v_result JSONB;
BEGIN
    -- Security Check
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Revenue & Credits Sold (Assume only SUCCESS orders and NOT deleted if we had soft delete for orders)
    SELECT 
        COALESCE(SUM(po.amount_vnd), 0),
        COALESCE(SUM(cp.credits + cp.bonus_credits), 0)
    INTO v_revenue_total, v_credits_sold
    FROM public.payment_orders po
    JOIN public.credit_packages cp ON po.package_id = cp.id
    WHERE po.status = 'SUCCESS';

    -- Credits Used
    SELECT COALESCE(SUM(lifetime_used), 0) INTO v_credits_used FROM public.wallets;

    -- Provider Cost (fallback to provider_cost_logs if ai_usage_logs isn't fully populated yet, or sum both. Let's use ai_usage_logs for future + provider_cost_logs for legacy)
    SELECT 
        (SELECT COALESCE(SUM(usd_cost), 0) FROM public.provider_cost_logs) +
        (SELECT COALESCE(SUM(usd_cost), 0) FROM public.ai_usage_logs)
    INTO v_provider_cost_usd;

    -- Active Users (Exclude soft deleted)
    SELECT COUNT(*) INTO v_active_users FROM public.profiles WHERE status = 'active' AND deleted_at IS NULL;

    -- Total Projects (Exclude soft deleted)
    SELECT COUNT(*) INTO v_total_projects FROM public.projects WHERE deleted_at IS NULL;

    -- Jobs
    SELECT 
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing', 'running')),
        COUNT(*) FILTER (WHERE status = 'failed')
    INTO v_rendering_jobs, v_failed_jobs
    FROM public.render_jobs;

    v_result := jsonb_build_object(
        'financial', jsonb_build_object(
            'revenue_total_vnd', v_revenue_total,
            'credits_sold', v_credits_sold,
            'credits_used', v_credits_used,
            'provider_cost_usd', v_provider_cost_usd,
            'gross_profit_estimate_usd', (v_revenue_total / 25000.0) - v_provider_cost_usd
        ),
        'operational', jsonb_build_object(
            'active_users', v_active_users,
            'total_projects', v_total_projects,
            'rendering_jobs', v_rendering_jobs,
            'failed_jobs', v_failed_jobs
        )
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- USERS LIST RPC
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
            p.deleted_at IS NULL -- Exclude soft deleted users
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
        tc.cnt as total_count
    FROM FilteredUsers fu
    CROSS JOIN TotalCount tc
    LEFT JOIN public.wallets w ON w.user_id = fu.id
    ORDER BY fu.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
