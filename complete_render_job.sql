CREATE OR REPLACE FUNCTION public.complete_render_job(
    p_job_id uuid,
    p_worker_id text,
    p_output_url text,
    p_usage_metadata jsonb,
    p_usd_cost numeric,
    p_request_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job record;
    v_tx_id uuid;
BEGIN
    RAISE LOG '[Billing] complete_render_job started | request_id: %, worker_id: %, job_id: %', p_request_id, p_worker_id, p_job_id;

    -- 1. Lock the job to prevent duplicate commits (Idempotency / Race Condition protection)
    SELECT * INTO v_job
    FROM public.render_jobs
    WHERE id = p_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE LOG '[Billing] complete_render_job failed | request_id: % - Job not found: %', p_request_id, p_job_id;
        RETURN false;
    END IF;

    -- Ensure we only commit if it's not already completed
    IF v_job.status = 'completed' THEN
        RAISE LOG '[Billing] complete_render_job skipped | request_id: % - Job already completed: %', p_request_id, p_job_id;
        RETURN true; -- Treat as success for idempotency
    END IF;

    -- 2. Update Job Status
    UPDATE public.render_jobs
    SET 
        status = 'completed',
        output_url = p_output_url,
        finished_at = NOW(),
        progress = 100,
        progress_message = 'Render completed successfully'
    WHERE id = p_job_id;

    -- 3. Find the PENDING transaction and COMMIT
    SELECT id INTO v_tx_id 
    FROM public.wallet_transactions 
    WHERE reference_type = 'render_jobs' 
      AND reference_id = p_job_id 
      AND status = 'PENDING';

    IF v_tx_id IS NOT NULL THEN
        RAISE LOG '[Billing] complete_render_job calling commit_credits | request_id: %, transaction_id: %', p_request_id, v_tx_id;
        PERFORM public.commit_credits(
            p_transaction_id := v_tx_id,
            p_provider_metadata := p_usage_metadata,
            p_actual_usd_cost := p_usd_cost,
            p_model := v_job.codec,
            p_pricing_version := '1',
            p_project_id := v_job.project_id
        );
    ELSE
        RAISE LOG '[Billing] complete_render_job warning | request_id: % - No RESERVE transaction found for job_id: %', p_request_id, p_job_id;
    END IF;

    RAISE LOG '[Billing] complete_render_job success | request_id: %, job_id: %', p_request_id, p_job_id;
    RETURN true;
END;
$$;
