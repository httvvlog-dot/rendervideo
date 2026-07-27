-- 1. Thêm cột image_tier vào bảng profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS image_tier VARCHAR(50) DEFAULT 'FREE';

-- 2. Cập nhật get_admin_users_list RPC để trả về image_tier (kế thừa các trường từ bản gốc)
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
    image_tier VARCHAR,
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
            p.id, p.email, p.full_name, p.role, p.status, p.is_verified, p.last_login, p.created_at, p.image_tier
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
        fu.image_tier,
        tc.cnt as total_count
    FROM FilteredUsers fu
    CROSS JOIN TotalCount tc
    LEFT JOIN public.wallets w ON w.user_id = fu.id
    ORDER BY fu.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
