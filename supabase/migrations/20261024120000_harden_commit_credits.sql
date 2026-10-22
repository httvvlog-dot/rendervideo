-- Migration: Harden commit_credits RPC
-- File: supabase/migrations/20261024120000_harden_commit_credits.sql
-- 
-- Description:
-- Production-safe hardening of public.commit_credits addressing:
-- 1. Locking hierarchy: Lock wallets FOR UPDATE *before* child records.
-- 2. Exact solvency check: Verifies each bucket exists and has balance >= reservation.
-- 3. Atomic assertion: GET DIAGNOSTICS ROW_COUNT on bucket, reservation, wallet, and transaction.
-- 4. No balance masking: Replaces GREATEST(0, ...) with strict underflow check.
-- 5. Strict active reservation sum match: SUM(reserved_amount) == ABS(amount).
-- 6. Provider cost log validation: Non-negative cost check and safe NOT NULL column population.
-- 7. Security: SECURITY DEFINER with fixed search_path = public, pg_temp.

CREATE OR REPLACE FUNCTION public.commit_credits(
    p_transaction_id UUID,
    p_provider_metadata JSONB DEFAULT NULL,
    p_actual_usd_cost NUMERIC DEFAULT NULL,
    p_model VARCHAR DEFAULT NULL,
    p_pricing_version VARCHAR DEFAULT NULL,
    p_project_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet_id UUID;
    v_locked_wallet_id UUID;
    v_user_id UUID;
    v_amount BIGINT;
    v_abs_amount BIGINT;
    v_status VARCHAR(50);
    v_provider VARCHAR;
    v_feature VARCHAR;
    v_wallet_reserved BIGINT;
    
    v_total_active_reserved BIGINT;
    v_res_count INT;
    v_committed_res_count INT := 0;
    
    v_res_id UUID;
    v_bucket_id UUID;
    v_res_amount BIGINT;
    v_bucket_curr_balance BIGINT;
    v_bucket_rows INT;
    v_res_rows INT;
    v_wallet_rows INT;
    v_tx_rows INT;
    v_total_balance BIGINT;
BEGIN
    -- 1. Read wallet_id without lock (MVCC Read)
    SELECT wallet_id INTO v_wallet_id
    FROM public.wallet_transactions
    WHERE id = p_transaction_id;

    IF v_wallet_id IS NULL THEN
        RETURN false;
    END IF;

    -- 2. ALWAYS LOCK WALLET FIRST (Hierarchical Root Mutex)
    SELECT reserved_credits INTO v_wallet_reserved
    FROM public.wallets
    WHERE id = v_wallet_id
    FOR UPDATE;

    IF v_wallet_reserved IS NULL THEN
        RETURN false;
    END IF;

    -- 3. Lock Transaction row under wallet lock
    SELECT wallet_id, user_id, amount, status, provider, feature
    INTO v_locked_wallet_id, v_user_id, v_amount, v_status, v_provider, v_feature
    FROM public.wallet_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND OR v_locked_wallet_id != v_wallet_id OR v_status != 'PENDING' THEN
        RETURN false;
    END IF;

    v_abs_amount := ABS(v_amount);

    -- 4. Verify sum of ACTIVE reservations matches transaction amount
    SELECT COALESCE(SUM(reserved_amount), 0), COUNT(*)
    INTO v_total_active_reserved, v_res_count
    FROM public.wallet_reservations
    WHERE wallet_transaction_id = p_transaction_id AND status = 'ACTIVE';

    IF v_total_active_reserved != v_abs_amount THEN
        RAISE EXCEPTION 'CRITICAL: Reservation discrepancy. Tx % requires %, but active reservations sum to %',
            p_transaction_id, v_abs_amount, v_total_active_reserved;
    END IF;

    -- 5. Verify wallet reserved_credits (STRICT check, NO GREATEST(0) masking)
    IF v_wallet_reserved < v_abs_amount THEN
        RAISE EXCEPTION 'CRITICAL: Wallet reserved_credits underflow. Wallet % has %, needs %',
            v_wallet_id, v_wallet_reserved, v_abs_amount;
    END IF;

    -- 6. Lock and process Reservations and deduct Buckets in deterministic order
    FOR v_res_id, v_bucket_id, v_res_amount IN
        SELECT id, bucket_id, reserved_amount 
        FROM public.wallet_reservations
        WHERE wallet_transaction_id = p_transaction_id AND status = 'ACTIVE'
        ORDER BY id ASC
        FOR UPDATE
    LOOP
        -- Lock and check Bucket balance
        SELECT balance INTO v_bucket_curr_balance
        FROM public.wallet_credit_buckets
        WHERE id = v_bucket_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'CRITICAL: Bucket % referenced by reservation % not found', v_bucket_id, v_res_id;
        END IF;

        IF v_bucket_curr_balance < v_res_amount THEN
            RAISE EXCEPTION 'CRITICAL: Bucket % has insufficient balance % for reservation % (needs %)', 
                v_bucket_id, v_bucket_curr_balance, v_res_id, v_res_amount;
        END IF;

        -- Deduct from bucket
        UPDATE public.wallet_credit_buckets 
        SET balance = balance - v_res_amount,
            updated_at = NOW()
        WHERE id = v_bucket_id;

        GET DIAGNOSTICS v_bucket_rows = ROW_COUNT;
        IF v_bucket_rows != 1 THEN
            RAISE EXCEPTION 'Atomic failure: Expected 1 bucket update, affected % for bucket %', v_bucket_rows, v_bucket_id;
        END IF;

        -- Mark reservation COMMITTED
        UPDATE public.wallet_reservations 
        SET status = 'COMMITTED' 
        WHERE id = v_res_id AND status = 'ACTIVE';

        GET DIAGNOSTICS v_res_rows = ROW_COUNT;
        IF v_res_rows != 1 THEN
            RAISE EXCEPTION 'Atomic failure: Expected 1 reservation update, affected % for reservation %', v_res_rows, v_res_id;
        END IF;

        v_committed_res_count := v_committed_res_count + 1;
    END LOOP;

    IF v_committed_res_count != v_res_count THEN
        RAISE EXCEPTION 'Atomic failure: Committed % reservations, expected %', v_committed_res_count, v_res_count;
    END IF;

    -- 7. Recalculate true balance from unexpired buckets
    SELECT COALESCE(SUM(balance), 0) INTO v_total_balance 
    FROM public.wallet_credit_buckets 
    WHERE wallet_id = v_wallet_id AND (expires_at IS NULL OR expires_at > NOW());

    -- 8. Update Wallet (exact arithmetic, no masking)
    UPDATE public.wallets 
    SET 
        balance_credits = v_total_balance,
        reserved_credits = reserved_credits - v_abs_amount,
        lifetime_used = lifetime_used + v_abs_amount,
        total_consumed_credits = total_consumed_credits + v_abs_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    GET DIAGNOSTICS v_wallet_rows = ROW_COUNT;
    IF v_wallet_rows != 1 THEN
        RAISE EXCEPTION 'Atomic failure: Expected 1 wallet update, affected % for wallet %', v_wallet_rows, v_wallet_id;
    END IF;

    -- 9. Update Transaction to COMPLETED (verifying still PENDING)
    UPDATE public.wallet_transactions
    SET status = 'COMPLETED', balance_after = v_total_balance
    WHERE id = p_transaction_id AND status = 'PENDING';

    GET DIAGNOSTICS v_tx_rows = ROW_COUNT;
    IF v_tx_rows != 1 THEN
        RAISE EXCEPTION 'Atomic failure: Expected 1 transaction update from PENDING to COMPLETED, affected %', v_tx_rows;
    END IF;

    -- 10. Log Provider Cost if provided
    IF p_actual_usd_cost IS NOT NULL THEN
        IF p_actual_usd_cost < 0 THEN
            RAISE EXCEPTION 'p_actual_usd_cost cannot be negative: %', p_actual_usd_cost;
        END IF;

        INSERT INTO public.provider_cost_logs (
            user_id, project_id, provider, model, request_type, usd_cost, usage_metadata, pricing_version, wallet_transaction_id
        ) VALUES (
            v_user_id, p_project_id, COALESCE(v_provider, 'unknown'), COALESCE(p_model, 'unknown'),
            COALESCE(v_feature, 'unknown'), p_actual_usd_cost, COALESCE(p_provider_metadata, '{}'::jsonb),
            COALESCE(p_pricing_version, '1'), p_transaction_id
        );
    END IF;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.commit_credits IS 
'Hardened commit_credits RPC: Wallet root mutex locking, strict bucket solvency verification, and zero-masking atomic rollback.';
