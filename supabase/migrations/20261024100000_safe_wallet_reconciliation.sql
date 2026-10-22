-- Migration: Safe Wallet Reservation Reconciliation RPC (Final Migration Gate Hardening)
-- File: supabase/migrations/20261024100000_safe_wallet_reconciliation.sql
-- 
-- Description:
-- Production-hardened wallet reconciliation RPC with strict atomic verification,
-- deadlock-consistent locking order, and total emitted record limits.
--
-- Safety Guarantees:
-- 1. Default dry-run mode: Read-only preview by default (p_dry_run = TRUE).
-- 2. Strict Input validation: p_max_records must be an integer between 1 and 500.
-- 3. Total record limit: Strictly limits total emitted rows across all categories.
-- 4. Deadlock-compatible lock ordering:
--    Step 1: public.wallet_transactions FOR UPDATE
--    Step 2: public.wallets FOR UPDATE
--    Step 3: public.wallet_reservations FOR UPDATE
--    (Follows the exact same locking hierarchy as commit_credits and release_credits).
-- 5. Comprehensive verification under lock:
--    - Re-checks transaction status is PENDING and wallet_id matches.
--    - Re-checks wallet reserved_credits >= amount.
--    - Re-checks reservation status is ACTIVE, expires_at < NOW(), and foreign keys match.
--    - Re-checks job existence (via FOUND) and termination status (FAILED / CANCELLED).
-- 6. Direct conditional atomic updates with ROW_COUNT assertions:
--    - Reservation update: WHERE id = ... AND status = 'ACTIVE'
--    - Transaction update: WHERE id = ... AND status = 'PENDING'
--    - Wallet update: WHERE id = ... AND reserved_credits >= amount (strict check, no GREATEST masking)
--    - If any update affects != 1 row, an exception is raised, triggering a full transaction rollback.
-- 7. PL/pgSQL variable hygiene: Aliases avoid column shadowing with RETURNS TABLE output columns.
-- 8. Zero balance impact: balance_credits is NEVER modified.
-- 9. Legacy orphan transactions (>7d old without active reservations) are strictly classified as
--    NEEDS_MANUAL_REVIEW and are NEVER automatically cancelled or decremented.
-- 10. Security: SECURITY DEFINER, search_path = public, pg_temp; restricted exclusively to service_role.

CREATE OR REPLACE FUNCTION public.reconcile_wallet_reservations(
    p_wallet_id UUID DEFAULT NULL,
    p_dry_run BOOLEAN DEFAULT TRUE,
    p_max_records INT DEFAULT 100
)
RETURNS TABLE (
    wallet_id UUID,
    transaction_id UUID,
    reservation_id UUID,
    credits_to_release BIGINT,
    tx_status TEXT,
    resv_status TEXT,
    job_type TEXT,
    job_id UUID,
    job_status TEXT,
    classification TEXT,
    action_taken TEXT,
    reason TEXT,
    projected_reserved_credits_impact BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_dry_run BOOLEAN;
    v_total_emitted INT := 0;
    v_record RECORD;

    -- Job verification variables
    v_job_status TEXT;
    v_job_exists BOOLEAN;

    -- Concurrency Lock verification variables
    v_locked_tx_status VARCHAR(50);
    v_locked_tx_wallet_id UUID;
    v_locked_w_reserved BIGINT;
    v_locked_r_status VARCHAR(20);
    v_locked_r_wallet_id UUID;
    v_locked_r_tx_id UUID;
    v_locked_r_expires_at TIMESTAMPTZ;

    v_rows_affected INT;
BEGIN
    -- 1. Input Validation
    IF p_max_records IS NULL OR p_max_records <= 0 THEN
        RAISE EXCEPTION 'p_max_records must be an integer between 1 and 500';
    END IF;
    IF p_max_records > 500 THEN
        RAISE EXCEPTION 'p_max_records exceeds the maximum allowed batch limit of 500';
    END IF;

    v_is_dry_run := COALESCE(p_dry_run, TRUE);

    -- =========================================================================
    -- CATEGORY 1: ACTIVE RESERVATIONS THAT HAVE EXPIRED
    -- =========================================================================
    FOR v_record IN
        SELECT 
            wr.id AS resv_id,
            wr.wallet_id AS w_id,
            wr.wallet_transaction_id AS tx_id,
            wr.reserved_amount AS amount,
            wr.status AS r_status,
            wr.expires_at AS r_expires_at,
            wt.status AS t_status,
            wt.reference_type AS ref_type,
            wt.reference_id AS ref_id,
            w.reserved_credits AS current_reserved,
            w.balance_credits AS current_balance
        FROM public.wallet_reservations wr
        JOIN public.wallet_transactions wt ON wt.id = wr.wallet_transaction_id
        JOIN public.wallets w ON w.id = wr.wallet_id
        WHERE wr.status = 'ACTIVE'
          AND wr.expires_at < NOW()
          AND (p_wallet_id IS NULL OR wr.wallet_id = p_wallet_id)
        ORDER BY wr.created_at ASC
        LIMIT p_max_records
    LOOP
        IF v_total_emitted >= p_max_records THEN
            EXIT;
        END IF;

        -- Accurate job lookup using PL/pgSQL FOUND semantics
        v_job_exists := FALSE;
        v_job_status := 'NOT_FOUND';

        IF v_record.ref_type = 'image_jobs' AND v_record.ref_id IS NOT NULL THEN
            SELECT ij.status::TEXT INTO v_job_status
            FROM public.image_jobs ij
            WHERE ij.id = v_record.ref_id;
            v_job_exists := FOUND;
        ELSIF v_record.ref_type = 'render_jobs' AND v_record.ref_id IS NOT NULL THEN
            SELECT rj.status::TEXT INTO v_job_status
            FROM public.render_jobs rj
            WHERE rj.id = v_record.ref_id;
            v_job_exists := FOUND;
        END IF;

        -- Populate return table columns (aliased to prevent shadowing)
        wallet_id := v_record.w_id;
        transaction_id := v_record.tx_id;
        reservation_id := v_record.resv_id;
        tx_status := v_record.t_status;
        resv_status := v_record.r_status;
        job_type := v_record.ref_type;
        job_id := v_record.ref_id;
        job_status := CASE WHEN v_job_exists THEN v_job_status ELSE 'NOT_FOUND' END;

        -- Safety Gate 1: Transaction status
        IF v_record.t_status != 'PENDING' THEN
            credits_to_release := 0;
            classification := 'NEEDS_MANUAL_REVIEW';
            action_taken := 'SKIPPED_TX_NOT_PENDING';
            reason := 'Reservation is ACTIVE but transaction is already ' || v_record.t_status || '; state mismatch requires audit';
            projected_reserved_credits_impact := 0;
            v_total_emitted := v_total_emitted + 1;
            RETURN NEXT;
            IF v_total_emitted >= p_max_records THEN EXIT; END IF;
            CONTINUE;

        -- Safety Gate 2: Referenced job existence
        ELSIF NOT v_job_exists THEN
            credits_to_release := 0;
            classification := 'NEEDS_MANUAL_REVIEW';
            action_taken := 'SKIPPED_JOB_NOT_FOUND';
            reason := 'Referenced job was not found in table ' || COALESCE(v_record.ref_type, 'N/A') || '; manual verification required';
            projected_reserved_credits_impact := 0;
            v_total_emitted := v_total_emitted + 1;
            RETURN NEXT;
            IF v_total_emitted >= p_max_records THEN EXIT; END IF;
            CONTINUE;

        -- Safety Gate 3: Job is still active
        ELSIF UPPER(v_job_status) IN ('PROCESSING', 'PENDING', 'QUEUED', 'PREPARING', 'DOWNLOADING', 'RENDERING', 'ENCODING', 'UPLOADING') THEN
            credits_to_release := 0;
            classification := 'NEEDS_MANUAL_REVIEW';
            action_taken := 'SKIPPED_JOB_STILL_ACTIVE';
            reason := 'Associated job is still in progress (' || v_job_status || ') despite reservation expiry; hold must be retained';
            projected_reserved_credits_impact := 0;
            v_total_emitted := v_total_emitted + 1;
            RETURN NEXT;
            IF v_total_emitted >= p_max_records THEN EXIT; END IF;
            CONTINUE;

        -- Safety Gate 4: Job completed but tx not committed
        ELSIF UPPER(v_job_status) IN ('COMPLETED') THEN
            credits_to_release := 0;
            classification := 'NEEDS_MANUAL_REVIEW';
            action_taken := 'SKIPPED_JOB_COMPLETED';
            reason := 'Associated job completed successfully but transaction was not committed; manual billing reconciliation required';
            projected_reserved_credits_impact := 0;
            v_total_emitted := v_total_emitted + 1;
            RETURN NEXT;
            IF v_total_emitted >= p_max_records THEN EXIT; END IF;
            CONTINUE;

        -- Safety Gate 5: Terminated job (FAILED / CANCELLED)
        ELSIF UPPER(v_job_status) IN ('FAILED', 'CANCELLED') THEN
            -- Check for balance discrepancy before claiming eligibility
            IF v_record.current_reserved < v_record.amount THEN
                credits_to_release := 0;
                classification := 'NEEDS_MANUAL_REVIEW';
                action_taken := 'SKIPPED_RESERVED_BALANCE_DISCREPANCY';
                reason := 'Wallet reserved_credits (' || v_record.current_reserved || ') is lower than reservation amount (' || v_record.amount || '); risk of balance distortion';
                projected_reserved_credits_impact := 0;
                v_total_emitted := v_total_emitted + 1;
                RETURN NEXT;
                IF v_total_emitted >= p_max_records THEN EXIT; END IF;
                CONTINUE;
            END IF;

            -- Eligible for release
            credits_to_release := v_record.amount;
            classification := 'AUTO_ELIGIBLE';
            projected_reserved_credits_impact := -v_record.amount;

            IF v_is_dry_run THEN
                action_taken := 'PREVIEW_ELIGIBLE';
                reason := 'Verified expired reservation with terminated job (' || v_job_status || '); ready for release';
                v_total_emitted := v_total_emitted + 1;
                RETURN NEXT;
                IF v_total_emitted >= p_max_records THEN EXIT; END IF;
                CONTINUE;
            ELSE
                -- =============================================================
                -- EXECUTION MODE: STRICT CONCURRENCY LOCKING & RE-VERIFICATION
                -- Lock Order: 1. wallet_transactions -> 2. wallets -> 3. wallet_reservations
                -- =============================================================
                
                -- Step 1: Lock Transaction
                SELECT wt.status, wt.wallet_id
                INTO v_locked_tx_status, v_locked_tx_wallet_id
                FROM public.wallet_transactions wt
                WHERE wt.id = v_record.tx_id
                FOR UPDATE;

                IF NOT FOUND OR v_locked_tx_status != 'PENDING' OR v_locked_tx_wallet_id != v_record.w_id THEN
                    action_taken := 'SKIPPED_CONCURRENT_STATE_CHANGED';
                    reason := 'Transaction status or integrity changed concurrently prior to lock';
                    credits_to_release := 0;
                    projected_reserved_credits_impact := 0;
                    v_total_emitted := v_total_emitted + 1;
                    RETURN NEXT;
                    IF v_total_emitted >= p_max_records THEN EXIT; END IF;
                    CONTINUE;
                END IF;

                -- Step 2: Lock Wallet
                SELECT w.reserved_credits
                INTO v_locked_w_reserved
                FROM public.wallets w
                WHERE w.id = v_record.w_id
                FOR UPDATE;

                IF NOT FOUND OR v_locked_w_reserved < v_record.amount THEN
                    action_taken := 'SKIPPED_CONCURRENT_STATE_CHANGED';
                    reason := 'Wallet reserved_credits changed concurrently or is insufficient under lock';
                    credits_to_release := 0;
                    projected_reserved_credits_impact := 0;
                    v_total_emitted := v_total_emitted + 1;
                    RETURN NEXT;
                    IF v_total_emitted >= p_max_records THEN EXIT; END IF;
                    CONTINUE;
                END IF;

                -- Step 3: Lock Reservation
                SELECT wr.status, wr.wallet_id, wr.wallet_transaction_id, wr.expires_at
                INTO v_locked_r_status, v_locked_r_wallet_id, v_locked_r_tx_id, v_locked_r_expires_at
                FROM public.wallet_reservations wr
                WHERE wr.id = v_record.resv_id
                FOR UPDATE;

                IF NOT FOUND OR v_locked_r_status != 'ACTIVE' 
                   OR v_locked_r_wallet_id != v_record.w_id 
                   OR v_locked_r_tx_id != v_record.tx_id 
                   OR v_locked_r_expires_at >= NOW() THEN
                    action_taken := 'SKIPPED_CONCURRENT_STATE_CHANGED';
                    reason := 'Reservation status, expiry, or link integrity changed concurrently prior to lock';
                    credits_to_release := 0;
                    projected_reserved_credits_impact := 0;
                    v_total_emitted := v_total_emitted + 1;
                    RETURN NEXT;
                    IF v_total_emitted >= p_max_records THEN EXIT; END IF;
                    CONTINUE;
                END IF;

                -- Step 4: Re-verify job status under locked transaction context
                v_job_exists := FALSE;
                IF v_record.ref_type = 'image_jobs' AND v_record.ref_id IS NOT NULL THEN
                    SELECT ij.status::TEXT INTO v_job_status
                    FROM public.image_jobs ij
                    WHERE ij.id = v_record.ref_id;
                    v_job_exists := FOUND;
                ELSIF v_record.ref_type = 'render_jobs' AND v_record.ref_id IS NOT NULL THEN
                    SELECT rj.status::TEXT INTO v_job_status
                    FROM public.render_jobs rj
                    WHERE rj.id = v_record.ref_id;
                    v_job_exists := FOUND;
                END IF;

                IF NOT v_job_exists OR UPPER(v_job_status) NOT IN ('FAILED', 'CANCELLED') THEN
                    action_taken := 'SKIPPED_CONCURRENT_STATE_CHANGED';
                    reason := 'Job status changed concurrently during lock acquisition';
                    credits_to_release := 0;
                    projected_reserved_credits_impact := 0;
                    v_total_emitted := v_total_emitted + 1;
                    RETURN NEXT;
                    IF v_total_emitted >= p_max_records THEN EXIT; END IF;
                    CONTINUE;
                END IF;

                -- =============================================================
                -- ATOMIC WRITE OPERATIONS WITH DIRECT CONDITIONAL CHECKS
                -- =============================================================

                -- 1. Update Reservation
                UPDATE public.wallet_reservations
                SET status = 'RELEASED'
                WHERE id = v_record.resv_id 
                  AND status = 'ACTIVE'
                  AND wallet_id = v_record.w_id
                  AND wallet_transaction_id = v_record.tx_id;

                GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                IF v_rows_affected != 1 THEN
                    RAISE EXCEPTION 'Atomic failure: Expected 1 reservation update, affected % for reservation id %', v_rows_affected, v_record.resv_id;
                END IF;

                -- 2. Update Transaction
                UPDATE public.wallet_transactions
                SET status = 'CANCELLED',
                    description = COALESCE(description, '') || ' | Auto-reconciled: Expired reservation with terminated job (' || v_job_status || ')'
                WHERE id = v_record.tx_id 
                  AND status = 'PENDING'
                  AND wallet_id = v_record.w_id;

                GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                IF v_rows_affected != 1 THEN
                    RAISE EXCEPTION 'Atomic failure: Expected 1 transaction update, affected % for transaction id %', v_rows_affected, v_record.tx_id;
                END IF;

                -- 3. Update Wallet with direct conditional check (no GREATEST masking)
                UPDATE public.wallets
                SET reserved_credits = reserved_credits - v_record.amount,
                    updated_at = NOW()
                WHERE id = v_record.w_id
                  AND reserved_credits >= v_record.amount;

                GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
                IF v_rows_affected != 1 THEN
                    RAISE EXCEPTION 'Atomic failure: Expected 1 wallet update, affected % for wallet id % (insufficient reserved_credits)', v_rows_affected, v_record.w_id;
                END IF;

                action_taken := 'RELEASED';
                reason := 'Successfully released ' || v_record.amount || ' credit(s) back to available pool';
                v_total_emitted := v_total_emitted + 1;
                RETURN NEXT;
                IF v_total_emitted >= p_max_records THEN EXIT; END IF;
                CONTINUE;
            END IF;
        ELSE
            credits_to_release := 0;
            classification := 'NEEDS_MANUAL_REVIEW';
            action_taken := 'SKIPPED_UNKNOWN_JOB_STATUS';
            reason := 'Associated job has unrecognized status (' || v_job_status || ')';
            projected_reserved_credits_impact := 0;
            v_total_emitted := v_total_emitted + 1;
            RETURN NEXT;
            IF v_total_emitted >= p_max_records THEN EXIT; END IF;
            CONTINUE;
        END IF;
    END LOOP;

    -- =========================================================================
    -- CATEGORY 2: LEGACY ORPHANED PENDING TRANSACTIONS (NO ACTIVE RESERVATION)
    -- =========================================================================
    FOR v_record IN
        SELECT 
            wt.id AS tx_id,
            wt.wallet_id AS w_id,
            ABS(wt.amount) AS amount,
            wt.status AS t_status,
            wt.reference_type AS ref_type,
            wt.reference_id AS ref_id,
            wt.created_at AS t_created_at,
            w.reserved_credits AS current_reserved,
            w.balance_credits AS current_balance
        FROM public.wallet_transactions wt
        JOIN public.wallets w ON w.id = wt.wallet_id
        LEFT JOIN public.wallet_reservations wr ON wr.wallet_transaction_id = wt.id AND wr.status = 'ACTIVE'
        WHERE wt.status = 'PENDING'
          AND wr.id IS NULL
          AND wt.created_at < NOW() - INTERVAL '7 days'
          AND (p_wallet_id IS NULL OR wt.wallet_id = p_wallet_id)
        ORDER BY wt.created_at ASC
        LIMIT p_max_records
    LOOP
        IF v_total_emitted >= p_max_records THEN
            EXIT;
        END IF;

        v_job_exists := FALSE;
        v_job_status := 'NOT_FOUND';

        IF v_record.ref_type = 'image_jobs' AND v_record.ref_id IS NOT NULL THEN
            SELECT ij.status::TEXT INTO v_job_status
            FROM public.image_jobs ij
            WHERE ij.id = v_record.ref_id;
            v_job_exists := FOUND;
        ELSIF v_record.ref_type = 'render_jobs' AND v_record.ref_id IS NOT NULL THEN
            SELECT rj.status::TEXT INTO v_job_status
            FROM public.render_jobs rj
            WHERE rj.id = v_record.ref_id;
            v_job_exists := FOUND;
        END IF;

        wallet_id := v_record.w_id;
        transaction_id := v_record.tx_id;
        reservation_id := NULL;
        credits_to_release := 0;
        tx_status := v_record.t_status;
        resv_status := 'NONE';
        job_type := v_record.ref_type;
        job_id := v_record.ref_id;
        job_status := CASE WHEN v_job_exists THEN v_job_status ELSE 'NOT_FOUND' END;
        projected_reserved_credits_impact := 0;

        -- Strict Safety Rule: DO NOT automatically decrement reserved_credits
        -- for orphan transactions without an active reservation row.
        classification := 'NEEDS_MANUAL_REVIEW';
        action_taken := 'NEEDS_MANUAL_REVIEW_FLAGGED';

        IF NOT v_job_exists THEN
            reason := 'Legacy orphaned pending transaction (>7d old) with non-existent job in table ' || COALESCE(v_record.ref_type, 'N/A') || '; requires manual balance verification before release';
        ELSE
            reason := 'Pending transaction (>7d old) with job status (' || v_job_status || ') but missing active reservation record; requires manual review';
        END IF;

        v_total_emitted := v_total_emitted + 1;
        RETURN NEXT;
        IF v_total_emitted >= p_max_records THEN EXIT; END IF;
    END LOOP;

    RETURN;
END;
$$;

-- Revoke permissions from public, anon, and authenticated users
REVOKE ALL ON FUNCTION public.reconcile_wallet_reservations(UUID, BOOLEAN, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_wallet_reservations(UUID, BOOLEAN, INT) FROM anon;
REVOKE ALL ON FUNCTION public.reconcile_wallet_reservations(UUID, BOOLEAN, INT) FROM authenticated;

-- Grant execution permission strictly to service_role (Admin / Background Reconciliation worker)
GRANT EXECUTE ON FUNCTION public.reconcile_wallet_reservations(UUID, BOOLEAN, INT) TO service_role;

-- Performance Optimization: Partial index for instant candidate scanning without full table scans
CREATE INDEX IF NOT EXISTS idx_wallet_reservations_active_expires 
ON public.wallet_reservations (expires_at) 
WHERE status = 'ACTIVE';

COMMENT ON FUNCTION public.reconcile_wallet_reservations IS 
'Safe wallet reconciliation RPC: audited preview (dry_run=true) and row-locked execution (dry_run=false) for expired reservations with terminated jobs.';
