-- Migration: Harden reserve_credits RPC
-- File: supabase/migrations/20261024110000_harden_reserve_credits.sql
-- 
-- Description:
-- Production-safe hardening of public.reserve_credits addressing:
-- 1. Input validation: Rejection of p_amount NULL or <= 0
-- 2. Input validation: Bounded p_timeout_minutes (default 15m, capped at 1440m / 24h)
-- 3. Idempotency race condition fix: Locking wallet FOR UPDATE *before* idempotency lookup
-- 4. Atomic assertion: GET DIAGNOSTICS ROW_COUNT on wallet reserved_credits update
-- 5. Bucket consistency: Excludes expired buckets (expires_at <= NOW()) and verifies unallocated math
-- 6. Security: SECURITY DEFINER with search_path = public, pg_temp

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
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet_id UUID;
    v_balance_credits BIGINT;
    v_reserved_credits BIGINT;
    v_available_credits BIGINT;
    v_transaction_id UUID;
    v_remaining_reserve BIGINT;
    v_bucket_id UUID;
    v_bucket_balance BIGINT;
    v_type public.transaction_type := 'USAGE';
    v_effective_timeout INT;
    v_rows_affected INT;
BEGIN
    -- 1. Input Validation: Amount
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'p_amount must be a positive integer greater than 0';
    END IF;

    -- 2. Input Validation: Timeout
    IF p_timeout_minutes IS NULL OR p_timeout_minutes <= 0 THEN
        v_effective_timeout := 15;
    ELSIF p_timeout_minutes > 1440 THEN
        v_effective_timeout := 1440; -- Cap at 24 hours maximum
    ELSE
        v_effective_timeout := p_timeout_minutes;
    END IF;

    -- 3. Concurrency-Safe Idempotency & Wallet Locking
    -- Acquire exclusive row lock on the user's wallet first.
    -- This serializes all concurrent reservation requests for this user,
    -- preventing two simultaneous requests from both passing the idempotency check!
    SELECT id, balance_credits, reserved_credits 
    INTO v_wallet_id, v_balance_credits, v_reserved_credits
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::BIGINT;
        RETURN;
    END IF;

    -- 4. Idempotency Check UNDER WALLET LOCK:
    -- Any concurrent request for the same reference is serialized behind the wallet lock.
    IF p_reference_type IS NOT NULL AND p_reference_id IS NOT NULL THEN
        SELECT id INTO v_transaction_id
        FROM public.wallet_transactions
        WHERE user_id = p_user_id 
          AND reference_type = p_reference_type 
          AND reference_id = p_reference_id
          AND status IN ('PENDING', 'COMPLETED')
        LIMIT 1;

        IF v_transaction_id IS NOT NULL THEN
            -- Idempotent return of the existing transaction
            v_available_credits := v_balance_credits - v_reserved_credits;
            RETURN QUERY SELECT true, v_transaction_id, v_available_credits;
            RETURN;
        END IF;
    END IF;

    -- 5. Solvency Check
    v_available_credits := v_balance_credits - v_reserved_credits;

    IF v_available_credits < p_amount THEN
        RETURN QUERY SELECT false, NULL::UUID, v_available_credits;
        RETURN;
    END IF;

    -- 6. Map feature to transaction type
    IF p_feature = 'Voice' THEN v_type := 'VOICE_GENERATION';
    ELSIF p_feature = 'Image' THEN v_type := 'IMAGE_GENERATION';
    ELSIF p_feature = 'Render' THEN v_type := 'VIDEO_RENDER';
    ELSIF p_feature = 'Script' THEN v_type := 'SCRIPT_GENERATION';
    END IF;

    -- 7. Create Pending Transaction
    INSERT INTO public.wallet_transactions (
        wallet_id, user_id, transaction_type, amount, balance_before, balance_after,
        feature, reference_type, reference_id, provider, description, metadata, status
    ) VALUES (
        v_wallet_id, p_user_id, v_type, -p_amount, v_balance_credits, v_balance_credits,
        p_feature, p_reference_type, p_reference_id, p_provider, p_description, p_metadata, 'PENDING'
    ) RETURNING id INTO v_transaction_id;

    -- 8. Allocate Reservations from Active Buckets
    v_remaining_reserve := p_amount;

    FOR v_bucket_id, v_bucket_balance IN 
        SELECT b.id, b.balance - COALESCE(SUM(r.reserved_amount), 0) as available_bucket_balance
        FROM public.wallet_credit_buckets b
        LEFT JOIN public.wallet_reservations r ON r.bucket_id = b.id AND r.status = 'ACTIVE'
        WHERE b.wallet_id = v_wallet_id AND (b.expires_at IS NULL OR b.expires_at > NOW())
        GROUP BY b.id, b.balance, b.expires_at, b.created_at
        HAVING b.balance - COALESCE(SUM(r.reserved_amount), 0) > 0
        ORDER BY b.expires_at ASC NULLS LAST, b.created_at ASC
    LOOP
        IF v_remaining_reserve <= 0 THEN
            EXIT;
        END IF;

        DECLARE
            v_reserve_amount BIGINT := LEAST(v_remaining_reserve, v_bucket_balance);
        BEGIN
            INSERT INTO public.wallet_reservations (
                wallet_id, wallet_transaction_id, bucket_id, reserved_amount, expires_at
            ) VALUES (
                v_wallet_id, v_transaction_id, v_bucket_id, v_reserve_amount, NOW() + (v_effective_timeout || ' minutes')::INTERVAL
            );
            v_remaining_reserve := v_remaining_reserve - v_reserve_amount;
        END;
    END LOOP;

    -- 9. Mathematical Consistency Assertion
    IF v_remaining_reserve > 0 THEN
        RAISE EXCEPTION 'CRITICAL: Bucket math mismatch. Remaining % unallocated', v_remaining_reserve;
    END IF;

    -- 10. Update Wallet Reserved Credits (with exact ROW_COUNT assertion)
    UPDATE public.wallets
    SET reserved_credits = reserved_credits + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected != 1 THEN
        RAISE EXCEPTION 'Atomic failure: Expected 1 wallet update, affected % for wallet id %', v_rows_affected, v_wallet_id;
    END IF;

    RETURN QUERY SELECT true, v_transaction_id, (v_available_credits - p_amount);
END;
$$;

-- Recommended Engine-Level Idempotency Constraint (Review with Admin before applying to Production):
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_unique_active_ref
-- ON public.wallet_transactions (user_id, reference_type, reference_id)
-- WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL AND status IN ('PENDING', 'COMPLETED');

COMMENT ON FUNCTION public.reserve_credits IS 
'Hardened credit reservation RPC: input validation, concurrency-safe idempotency under wallet lock, and bucket math verification.';
