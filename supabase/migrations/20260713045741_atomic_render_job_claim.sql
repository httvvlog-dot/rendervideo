-- Add progress_message if it does not exist
ALTER TABLE public.render_jobs ADD COLUMN IF NOT EXISTS progress_message TEXT;

-- Create atomic claim RPC
CREATE OR REPLACE FUNCTION public.claim_next_render_job(
    p_worker_id TEXT
)
RETURNS public.render_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    claimed_job public.render_jobs;
BEGIN
    IF p_worker_id IS NULL OR p_worker_id = '' THEN
        RAISE EXCEPTION 'Worker ID cannot be empty';
    END IF;

    UPDATE public.render_jobs
    SET 
        status = 'preparing',
        worker_id = p_worker_id,
        started_at = COALESCE(started_at, now())
    WHERE id = (
        SELECT id
        FROM public.render_jobs
        WHERE status = 'queued'
        ORDER BY created_at ASC, id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING * INTO claimed_job;

    RETURN claimed_job;
END;
$$;
