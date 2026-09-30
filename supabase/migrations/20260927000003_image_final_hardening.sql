-- Migration: Final Hardening for Image Jobs and Billing Idempotency

-- 1. Client Idempotency
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS provider_result JSONB;

-- 2. Modify reserve_credits for DB-level Idempotency
CREATE OR REPLACE FUNCTION public.reserve_credits(
    p_user_id UUID,
    p_amount BIGINT,
    p_feature VARCHAR,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_provider VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_timeout_minutes INT DEFAULT 15
) RETURNS TABLE (success BOOLEAN, transaction_id UUID, available_credits BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_wallet_id UUID;
    v_balance_credits BIGINT;
    v_reserved_credits BIGINT;
    v_available_credits BIGINT;
    v_transaction_id UUID;
    v_remaining_reserve BIGINT := p_amount;
    v_bucket_id UUID;
    v_bucket_balance BIGINT;
    v_type public.transaction_type := 'USAGE';
BEGIN
    -- Idempotency check: If a PENDING or COMPLETED transaction already exists for this reference_id/type
    IF p_reference_type IS NOT NULL AND p_reference_id IS NOT NULL THEN
        SELECT id INTO v_transaction_id
        FROM public.wallet_transactions
        WHERE user_id = p_user_id 
          AND reference_type = p_reference_type 
          AND reference_id = p_reference_id
          AND status IN ('PENDING', 'COMPLETED')
        LIMIT 1;

        IF v_transaction_id IS NOT NULL THEN
            -- Return the existing transaction (Idempotent response)
            SELECT (balance_credits - reserved_credits) INTO v_available_credits FROM public.wallets WHERE user_id = p_user_id;
            RETURN QUERY SELECT true, v_transaction_id, v_available_credits;
            RETURN;
        END IF;
    END IF;

    -- 1. Lock wallet
    SELECT id, balance_credits, reserved_credits INTO v_wallet_id, v_balance_credits, v_reserved_credits
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::BIGINT;
        RETURN;
    END IF;

    v_available_credits := v_balance_credits - v_reserved_credits;

    IF v_available_credits < p_amount THEN
        RETURN QUERY SELECT false, NULL::UUID, v_available_credits;
        RETURN;
    END IF;

    -- 2. Map feature to transaction type
    IF p_feature = 'Voice' THEN v_type := 'VOICE_GENERATION';
    ELSIF p_feature = 'Image' THEN v_type := 'IMAGE_GENERATION';
    ELSIF p_feature = 'Render' THEN v_type := 'VIDEO_RENDER';
    ELSIF p_feature = 'Script' THEN v_type := 'SCRIPT_GENERATION';
    END IF;

    -- 3. Create Pending Transaction
    INSERT INTO public.wallet_transactions (
        wallet_id, user_id, transaction_type, amount, balance_before, balance_after,
        feature, reference_type, reference_id, provider, description, metadata, status
    ) VALUES (
        v_wallet_id, p_user_id, v_type, -p_amount, v_balance_credits, v_balance_credits,
        p_feature, p_reference_type, p_reference_id, p_provider, p_description, p_metadata, 'PENDING'
    ) RETURNING id INTO v_transaction_id;

    -- 4. Create Reservations from Buckets
    FOR v_bucket_id, v_bucket_balance IN 
        SELECT b.id, b.balance - COALESCE(SUM(r.reserved_amount), 0) as available_bucket_balance
        FROM public.wallet_credit_buckets b
        LEFT JOIN public.wallet_reservations r ON r.bucket_id = b.id AND r.status = 'ACTIVE'
        WHERE b.wallet_id = v_wallet_id AND (b.expires_at IS NULL OR b.expires_at > NOW())
        GROUP BY b.id, b.balance, b.expires_at
        HAVING b.balance - COALESCE(SUM(r.reserved_amount), 0) > 0
        ORDER BY b.expires_at ASC NULLS LAST
    LOOP
        IF v_remaining_reserve <= 0 THEN
            EXIT;
        END IF;

        DECLARE
            v_reserve_amount BIGINT := LEAST(v_remaining_reserve, v_bucket_balance);
        BEGIN
            INSERT INTO public.wallet_reservations (
                transaction_id, bucket_id, reserved_amount, expires_at
            ) VALUES (
                v_transaction_id, v_bucket_id, v_reserve_amount, NOW() + (p_timeout_minutes || ' minutes')::INTERVAL
            );
            v_remaining_reserve := v_remaining_reserve - v_reserve_amount;
        END;
    END LOOP;

    IF v_remaining_reserve > 0 THEN
        RAISE EXCEPTION 'CRITICAL: Bucket math mismatch. Remaining %', v_remaining_reserve;
    END IF;

    UPDATE public.wallets
    SET reserved_credits = reserved_credits + p_amount
    WHERE id = v_wallet_id;

    RETURN QUERY SELECT true, v_transaction_id, v_available_credits - p_amount;
END;
$$;

-- 3. recover_stuck_image_jobs logic
CREATE OR REPLACE FUNCTION public.recover_stuck_image_jobs()
RETURNS SETOF public.image_jobs
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.image_jobs
    SET status = 'PENDING',
        worker_id = NULL,
        updated_at = now()
    WHERE status = 'PROCESSING' AND lease_until < now()
    RETURNING *;
END;
$$;
