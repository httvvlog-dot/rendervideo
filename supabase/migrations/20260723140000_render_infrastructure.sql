CREATE TABLE IF NOT EXISTS public.render_workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_name TEXT NOT NULL,
    hostname TEXT,
    worker_mode TEXT DEFAULT 'production',
    status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance')),
    cpu_usage FLOAT DEFAULT 0,
    ram_usage FLOAT DEFAULT 0,
    max_concurrent_jobs INTEGER DEFAULT 1,
    active_jobs INTEGER DEFAULT 0,
    app_version TEXT,
    worker_version TEXT,
    ffmpeg_version TEXT,
    remotion_version TEXT,
    capabilities JSONB DEFAULT '{}'::jsonb,
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    total_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 100,
    average_render_time FLOAT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_job_completed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    uptime_seconds INTEGER DEFAULT 0,
    CONSTRAINT uq_render_worker UNIQUE (worker_name, hostname)
);

-- Convert render_jobs.worker_id from TEXT to UUID safely
DO $$
BEGIN
    -- Only convert if the column is text or varchar
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='render_jobs' AND column_name='worker_id' AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.render_jobs 
        ALTER COLUMN worker_id TYPE UUID USING (
            CASE 
                WHEN worker_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN worker_id::uuid 
                ELSE NULL 
            END
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.render_worker_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES public.render_workers(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.render_jobs(id) ON DELETE CASCADE,
    status TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.render_dead_letter_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_job_id UUID,
    worker_id UUID,
    failed_reason TEXT,
    retry_count INTEGER,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Register a new worker or update an existing one
CREATE OR REPLACE FUNCTION public.worker_register(
    p_worker_name TEXT,
    p_hostname TEXT,
    p_worker_mode TEXT,
    p_max_concurrent_jobs INTEGER,
    p_app_version TEXT,
    p_worker_version TEXT,
    p_ffmpeg_version TEXT,
    p_remotion_version TEXT,
    p_capabilities JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_worker_id UUID;
BEGIN
    INSERT INTO public.render_workers (
        worker_name, hostname, worker_mode, max_concurrent_jobs, 
        app_version, worker_version, ffmpeg_version, remotion_version, 
        capabilities, status, last_heartbeat_at, started_at, uptime_seconds
    ) VALUES (
        p_worker_name, p_hostname, p_worker_mode, p_max_concurrent_jobs, 
        p_app_version, p_worker_version, p_ffmpeg_version, p_remotion_version, 
        p_capabilities, 'online', NOW(), NOW(), 0
    )
    ON CONFLICT (worker_name, hostname) DO UPDATE SET
        status = 'online',
        worker_mode = EXCLUDED.worker_mode,
        max_concurrent_jobs = EXCLUDED.max_concurrent_jobs,
        app_version = EXCLUDED.app_version,
        worker_version = EXCLUDED.worker_version,
        ffmpeg_version = EXCLUDED.ffmpeg_version,
        remotion_version = EXCLUDED.remotion_version,
        capabilities = EXCLUDED.capabilities,
        last_heartbeat_at = NOW(),
        started_at = NOW(),
        uptime_seconds = 0,
        updated_at = NOW()
    RETURNING id INTO v_worker_id;

    RETURN v_worker_id;
END;
$$;

-- Heartbeat function to update worker stats
CREATE OR REPLACE FUNCTION public.worker_heartbeat(
    p_worker_id UUID,
    p_cpu_usage FLOAT,
    p_ram_usage FLOAT,
    p_active_jobs INTEGER,
    p_uptime_seconds INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows INTEGER;
BEGIN
    UPDATE public.render_workers SET
        status = 'online',
        cpu_usage = p_cpu_usage,
        ram_usage = p_ram_usage,
        active_jobs = p_active_jobs,
        uptime_seconds = p_uptime_seconds,
        last_heartbeat_at = NOW()
    WHERE id = p_worker_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        RAISE EXCEPTION 'Worker not found';
    END IF;
END;
$$;

-- Update worker metrics after a job completes
CREATE OR REPLACE FUNCTION public.worker_update_metrics(
    p_worker_id UUID,
    p_job_id UUID,
    p_is_success BOOLEAN,
    p_render_time_seconds FLOAT,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INTEGER;
    v_failed INTEGER;
    v_avg FLOAT;
BEGIN
    -- 1. Update render_worker_jobs history
    UPDATE public.render_worker_jobs SET
        status = CASE WHEN p_is_success THEN 'completed' ELSE 'failed' END,
        finished_at = NOW()
    WHERE worker_id = p_worker_id AND job_id = p_job_id;

    -- 2. Fetch current stats
    SELECT total_jobs, failed_jobs, average_render_time 
    INTO v_total, v_failed, v_avg
    FROM public.render_workers 
    WHERE id = p_worker_id;

    -- Calculate new values
    v_total := COALESCE(v_total, 0) + 1;
    IF NOT p_is_success THEN
        v_failed := COALESCE(v_failed, 0) + 1;
    END IF;
    
    -- Moving average approximation for render time
    IF p_is_success AND p_render_time_seconds > 0 THEN
        DECLARE
            v_success INTEGER := (v_total - COALESCE(v_failed, 0));
        BEGIN
            IF v_success <= 1 THEN
                v_avg := p_render_time_seconds;
            ELSE
                v_avg := COALESCE(v_avg, 0) + ((p_render_time_seconds - COALESCE(v_avg, 0)) / v_success);
            END IF;
        END;
    END IF;

    -- Update table
    UPDATE public.render_workers SET
        total_jobs = v_total,
        failed_jobs = v_failed,
        success_rate = CASE WHEN v_total > 0 THEN ((v_total - v_failed)::FLOAT / v_total) * 100 ELSE 100 END,
        average_render_time = v_avg,
        last_error = CASE WHEN NOT p_is_success THEN p_error_message ELSE last_error END,
        last_job_completed_at = CASE WHEN p_is_success THEN NOW() ELSE last_job_completed_at END
    WHERE id = p_worker_id;
END;
$$;

-- Safe Queue Lock using FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_next_render_job(
    p_worker_id UUID,
    p_capabilities JSONB DEFAULT '{}'::jsonb
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
BEGIN
    -- Note: p_capabilities is reserved for future Scheduler use
    
    -- Try to lock the oldest pending job
    FOR v_job IN
        SELECT r.id, r.project_id, r.retry_count, r.timeline_snapshot, r.preset_snapshot
        FROM public.render_jobs r
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Dead Letter Queue Check
        IF COALESCE(v_job.retry_count, 0) >= 3 THEN
            -- Move to DLQ inside an explicit transaction block (already in plpgsql, but for readability)
            BEGIN
                INSERT INTO public.render_dead_letter_jobs (original_job_id, worker_id, failed_reason, retry_count, payload)
                VALUES (v_job.id, p_worker_id, 'Exceeded max retries (3)', v_job.retry_count, jsonb_build_object('timeline', v_job.timeline_snapshot, 'preset', v_job.preset_snapshot));
                
                -- Delete from main table to keep it clean
                DELETE FROM public.render_jobs WHERE render_jobs.id = v_job.id;
            END;
            
            CONTINUE; -- Try next job in the loop
        END IF;

        -- Valid Job found: Mark as preparing and assign to this worker
        UPDATE public.render_jobs 
        SET 
            status = 'preparing',
            worker_id = p_worker_id,
            retry_count = COALESCE(retry_count, 0) + 1,
            finished_at = NULL
        WHERE render_jobs.id = v_job.id AND render_jobs.status = 'pending';

        -- Verify update affected a row (status might have changed)
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            CONTINUE;
        END IF;

        -- Insert into history
        INSERT INTO public.render_worker_jobs (worker_id, job_id, status, started_at)
        VALUES (p_worker_id, v_job.id, 'claimed', NOW());

        RETURN QUERY SELECT v_job.id, v_job.project_id, 'claimed'::TEXT;
        RETURN; -- Exit the function once we claimed a job
    END LOOP;
END;
$$;

-- 5. RLS Policies for Admin Dashboard
ALTER TABLE public.render_workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view render workers" ON public.render_workers;
CREATE POLICY "Admins can view render workers"
ON public.render_workers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

ALTER TABLE public.render_worker_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view render worker jobs" ON public.render_worker_jobs;
CREATE POLICY "Admins can view render worker jobs"
ON public.render_worker_jobs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

ALTER TABLE public.render_dead_letter_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view dead letter jobs" ON public.render_dead_letter_jobs;
CREATE POLICY "Admins can view dead letter jobs"
ON public.render_dead_letter_jobs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

-- 6. Harden RPC Security (Revoke from PUBLIC, grant to service_role)
REVOKE EXECUTE ON FUNCTION public.worker_register(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.worker_register(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.worker_register(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.worker_register(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.worker_heartbeat(UUID, FLOAT, FLOAT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.worker_heartbeat(UUID, FLOAT, FLOAT, INTEGER, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.worker_heartbeat(UUID, FLOAT, FLOAT, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.worker_heartbeat(UUID, FLOAT, FLOAT, INTEGER, INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION public.worker_update_metrics(UUID, UUID, BOOLEAN, FLOAT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.worker_update_metrics(UUID, UUID, BOOLEAN, FLOAT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.worker_update_metrics(UUID, UUID, BOOLEAN, FLOAT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.worker_update_metrics(UUID, UUID, BOOLEAN, FLOAT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_next_render_job(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_next_render_job(UUID, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_next_render_job(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_next_render_job(UUID, JSONB) TO service_role;
