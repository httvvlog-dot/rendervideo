ALTER TABLE public.render_workers ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.render_workers ADD COLUMN IF NOT EXISTS uptime_seconds INTEGER DEFAULT 0;
ALTER TABLE public.render_workers ADD COLUMN IF NOT EXISTS last_job_completed_at TIMESTAMPTZ;
ALTER TABLE public.render_workers DROP CONSTRAINT IF EXISTS uq_render_worker;
ALTER TABLE public.render_workers ADD CONSTRAINT uq_render_worker UNIQUE (worker_name, hostname);
