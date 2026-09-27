-- Add worker hardening columns
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE public.image_jobs ADD COLUMN IF NOT EXISTS worker_id TEXT;

-- Create atomic claim RPC for image jobs
CREATE OR REPLACE FUNCTION public.claim_next_image_job(
    p_worker_id TEXT
)
RETURNS public.image_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS \$\$
DECLARE
    claimed_job public.image_jobs;
BEGIN
    IF p_worker_id IS NULL OR p_worker_id = '' THEN
        RAISE EXCEPTION 'Worker ID cannot be empty';
    END IF;

    UPDATE public.image_jobs
    SET 
        status = 'PROCESSING',
        worker_id = p_worker_id,
        processing_started_at = COALESCE(processing_started_at, now()),
        lease_until = now() + interval '5 minutes',
        attempt_count = COALESCE(attempt_count, 0) + 1,
        updated_at = now()
    WHERE id = (
        SELECT id
        FROM public.image_jobs
        WHERE status = 'PENDING' OR (status = 'PROCESSING' AND lease_until < now())
        ORDER BY created_at ASC, id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING * INTO claimed_job;

    RETURN claimed_job;
END;
\$\$;
