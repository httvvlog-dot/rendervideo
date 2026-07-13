-- D5: Worker Crash Recovery
ALTER TABLE public.render_jobs ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ NULL;
ALTER TABLE public.render_jobs ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;

-- Function to requeue stale jobs
CREATE OR REPLACE FUNCTION public.requeue_stale_render_jobs(
    p_timeout_minutes INTEGER DEFAULT 15,
    p_max_attempts INTEGER DEFAULT 3
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    requeued_count INTEGER;
BEGIN
    UPDATE public.render_jobs
    SET 
        status = 'queued',
        worker_id = NULL,
        progress_message = 'Requeued after worker crash',
        attempt_count = attempt_count + 1
    WHERE 
        status IN ('preparing', 'downloading', 'rendering', 'encoding', 'uploading')
        AND (heartbeat_at IS NULL OR heartbeat_at < now() - (p_timeout_minutes || ' minutes')::INTERVAL)
        AND attempt_count < p_max_attempts;

    GET DIAGNOSTICS requeued_count = ROW_COUNT;
    
    -- Mark permanently failed jobs
    UPDATE public.render_jobs
    SET 
        status = 'failed',
        error_message = 'Permanently failed after maximum retry attempts',
        finished_at = now()
    WHERE 
        status IN ('preparing', 'downloading', 'rendering', 'encoding', 'uploading')
        AND (heartbeat_at IS NULL OR heartbeat_at < now() - (p_timeout_minutes || ' minutes')::INTERVAL)
        AND attempt_count >= p_max_attempts;

    RETURN requeued_count;
END;
$$;
