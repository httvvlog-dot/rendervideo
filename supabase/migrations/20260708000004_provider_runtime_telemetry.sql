-- 1. Modify health_status constraint in provider_credentials
ALTER TABLE public.provider_credentials DROP CONSTRAINT IF EXISTS provider_credentials_health_status_check;
ALTER TABLE public.provider_credentials ADD CONSTRAINT provider_credentials_health_status_check CHECK (health_status IN ('healthy', 'warning', 'offline', 'rate_limited', 'unauthorized', 'timeout', 'unknown'));

-- 2. Add Telemetry columns to provider_credentials
ALTER TABLE public.provider_credentials ADD COLUMN IF NOT EXISTS success_count integer DEFAULT 0;
ALTER TABLE public.provider_credentials ADD COLUMN IF NOT EXISTS failure_count integer DEFAULT 0;
ALTER TABLE public.provider_credentials ADD COLUMN IF NOT EXISTS average_latency integer;
ALTER TABLE public.provider_credentials RENAME COLUMN latency TO last_latency;
ALTER TABLE public.provider_credentials ADD COLUMN IF NOT EXISTS last_success_at timestamp with time zone;
ALTER TABLE public.provider_credentials ADD COLUMN IF NOT EXISTS last_failure_at timestamp with time zone;

-- 3. Create runtime_logs table
CREATE TABLE public.runtime_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
    credential_id uuid REFERENCES public.provider_credentials(id) ON DELETE SET NULL,
    project_id uuid, -- Reference to projects table, omitting strict FK to avoid cascade issues if projects are deleted
    pipeline_step text NOT NULL,
    status text NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
    model text,
    duration_ms integer,
    cost numeric(10, 6),
    tokens integer,
    error_code text,
    error_message text,
    started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    finished_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.runtime_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs via service role, or just keep it open for server-side inserts
