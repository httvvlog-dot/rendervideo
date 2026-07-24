CREATE OR REPLACE FUNCTION public.claim_next_render_job(
    p_worker_id UUID,
    p_capabilities JSONB DEFAULT '{}'::jsonb,
    p_request_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job RECORD;
    v_rows INTEGER;
    v_tx_id UUID;
BEGIN
    RAISE LOG '[Worker] claim_next_render_job started | request_id: %, worker_id: %', p_request_id, p_worker_id;

    -- Try to lock the oldest pending job
    FOR v_job IN 
        SELECT r.id, r.project_id, r.retry_count, r.timeline_snapshot, r.preset_snapshot 
        FROM public.render_jobs r
        WHERE r.status = 'queued'
        ORDER BY r.created_at ASC
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Dead Letter Queue Check
        IF COALESCE(v_job.retry_count, 0) >= 3 THEN
            RAISE LOG '[Queue] Moving job to DLQ | request_id: %, job_id: %', p_request_id, v_job.id;
            
            INSERT INTO public.render_dead_letter_jobs (original_job_id, worker_id, failed_reason, retry_count, payload)
            VALUES (v_job.id, p_worker_id, 'Exceeded max retries (3)', v_job.retry_count, jsonb_build_object('timeline', v_job.timeline_snapshot, 'preset', v_job.preset_snapshot));
            
            DELETE FROM public.render_jobs WHERE render_jobs.id = v_job.id;

            -- Billing: Release credits transactionally
            SELECT wt.id INTO v_tx_id 
            FROM public.wallet_transactions wt
            WHERE wt.reference_type = 'render_jobs' 
              AND wt.reference_id = v_job.id 
              AND wt.status = 'PENDING';

            IF v_tx_id IS NOT NULL THEN
                RAISE LOG '[Billing] Releasing credits due to DLQ | request_id: %, transaction_id: %', p_request_id, v_tx_id;
                PERFORM public.release_credits(v_tx_id, 'Moved to DLQ after max retries');
            ELSE
                RAISE LOG '[Billing] No RESERVE transaction found for DLQ job | request_id: %, job_id: %', p_request_id, v_job.id;
            END IF;
            
            CONTINUE; -- Try next job in the loop
        END IF;

        -- Valid Job found: Mark as CLAIMED and assign to this worker
        UPDATE public.render_jobs
        SET 
            status = 'preparing',
            worker_id = p_worker_id,
            retry_count = COALESCE(retry_count, 0) + 1,
            finished_at = NULL
        WHERE render_jobs.id = v_job.id AND render_jobs.status = 'queued';

        -- Verify update affected a row (status might have changed)
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            CONTINUE;
        END IF;

        RAISE LOG '[Worker] Claimed job successfully | request_id: %, job_id: %', p_request_id, v_job.id;
        
        -- Return the claimed job
        RETURN QUERY SELECT v_job.id, v_job.project_id, 'claimed'::TEXT;
        RETURN;
    END LOOP;

    -- No jobs available
    RETURN;
END;
$$;
