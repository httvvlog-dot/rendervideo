-- Migration: Harden release_credits RPC
-- File: supabase/migrations/20261024121000_harden_release_credits.sql
-- 
-- Description:
-- Production-safe hardening of public.release_credits addressing:
-- 1. Locking hierarchy: Lock wallets FOR UPDATE *before* child records.
-- 2. Exact verification: Verifies active reservations sum matches transaction amount.
-- 3. Atomic assertion: GET DIAGNOSTICS ROW_COUNT on reservation, wallet, and transaction.
-- 4. No balance masking: Replaces GREATEST(0, ...) with strict underflow assertion.
-- 5. Strict state transition: Only transitions from PENDING to CANCELLED.
-- 6. Security: SECURITY DEFINER with fixed search_path = public, pg_temp.

CREATE OR REPLACE FUNCTION public.release_credits(
    p_transaction_id UUID,
    p_reason TEXT DEFAULT 'Released manually'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet_id UUID;
    v_locked_wallet_id UUID;
    v_amount BIGINT;
    v_abs_amount BIGINT;
    v_status VARCHAR(50);
    v_wallet_reserved BIGINT;
    
    v_total_active_reserved BIGINT;
    v_res_count INT;
    v_released_res_count INT;
    v_wallet_rows INT;
    v_tx_rows INT;
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
    SELECT wallet_id, amount, status
    INTO v_locked_wallet_id, v_amount, v_status
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
        RAISE EXCEPTION 'CRITICAL: Reservation discrepancy on release. Tx % has amount %, but active reservations sum to %',
            p_transaction_id, v_abs_amount, v_total_active_reserved;
    END IF;

    -- 5. Verify wallet reserved_credits (STRICT check, NO GREATEST(0) masking)
    IF v_wallet_reserved < v_abs_amount THEN
        RAISE EXCEPTION 'CRITICAL: Wallet reserved_credits underflow on release. Wallet % has %, needs %',
            v_wallet_id, v_wallet_reserved, v_abs_amount;
    END IF;

    -- 6. Lock and transition Reservations to RELEASED
    UPDATE public.wallet_reservations 
    SET status = 'RELEASED' 
    WHERE wallet_transaction_id = p_transaction_id AND status = 'ACTIVE';

    GET DIAGNOSTICS v_released_res_count = ROW_COUNT;
    IF v_released_res_count != v_res_count THEN
        RAISE EXCEPTION 'Atomic failure: Expected % reservations released, affected %', v_res_count, v_released_res_count;
    END IF;

    -- 7. Free reserved_credits on Wallet (balance_credits strictly untouched)
    UPDATE public.wallets 
    SET 
        reserved_credits = reserved_credits - v_abs_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    GET DIAGNOSTICS v_wallet_rows = ROW_COUNT;
    IF v_wallet_rows != 1 THEN
        RAISE EXCEPTION 'Atomic failure: Expected 1 wallet update, affected % for wallet %', v_wallet_rows, v_wallet_id;
    END IF;

    -- 8. Update Transaction to CANCELLED (verifying still PENDING)
    UPDATE public.wallet_transactions
    SET 
        status = 'CANCELLED',
        description = COALESCE(description, '') || ' | ' || p_reason
    WHERE id = p_transaction_id AND status = 'PENDING';

    GET DIAGNOSTICS v_tx_rows = ROW_COUNT;
    IF v_tx_rows != 1 THEN
        RAISE EXCEPTION 'Atomic failure: Expected 1 transaction update from PENDING to CANCELLED, affected %', v_tx_rows;
    END IF;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.release_credits IS 
'Hardened release_credits RPC: Wallet root mutex locking, strict active reservation verification, and zero-masking atomic rollback.';
