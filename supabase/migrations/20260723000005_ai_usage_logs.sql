BEGIN;

-- AI USAGE LOGS (Unified Provider Telemetry)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    render_job_id UUID REFERENCES public.render_jobs(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL, -- e.g. OpenAI, ElevenLabs, Runway
    model VARCHAR(100) NOT NULL,
    
    -- Specific Metrics
    tokens BIGINT DEFAULT 0,
    characters BIGINT DEFAULT 0,
    seconds DECIMAL(10, 2) DEFAULT 0,
    images INT DEFAULT 0,
    videos INT DEFAULT 0,
    requests INT DEFAULT 0,
    
    -- Financials
    usd_cost DECIMAL(15, 6) NOT NULL DEFAULT 0,
    
    -- Metadata Context
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for fast querying
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);

COMMIT;
