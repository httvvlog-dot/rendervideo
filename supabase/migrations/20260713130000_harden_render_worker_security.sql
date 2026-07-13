-- D.2 Harden Security: Forward-only migration

-- 1. Enforce at most one active render job per project
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_render_job 
ON public.render_jobs (project_id) 
WHERE status IN ('queued', 'preparing', 'downloading', 'rendering', 'encoding', 'uploading');

-- 2. Harden claim_next_render_job RPC
REVOKE EXECUTE ON FUNCTION public.claim_next_render_job(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_next_render_job(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_next_render_job(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_next_render_job(TEXT) TO service_role;

-- 3. Harden requeue_stale_render_jobs RPC
REVOKE EXECUTE ON FUNCTION public.requeue_stale_render_jobs(INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.requeue_stale_render_jobs(INTEGER, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.requeue_stale_render_jobs(INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.requeue_stale_render_jobs(INTEGER, INTEGER) TO service_role;
