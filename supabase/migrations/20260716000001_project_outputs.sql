-- Create project_outputs table
CREATE TABLE IF NOT EXISTS public.project_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    render_job_id UUID REFERENCES public.render_jobs(id) ON DELETE SET NULL,
    version INT NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT true,
    title TEXT,
    output_key TEXT NOT NULL,
    output_url TEXT,
    thumbnail_key TEXT,
    thumbnail_url TEXT,
    duration_ms INTEGER,
    width INTEGER,
    height INTEGER,
    fps INTEGER,
    file_size BIGINT,
    video_codec TEXT,
    audio_codec TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_outputs_project_id ON public.project_outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_outputs_project_current ON public.project_outputs(project_id) WHERE is_current = true;

-- Enable RLS
ALTER TABLE public.project_outputs ENABLE ROW LEVEL SECURITY;

-- 1. Allow users to SELECT their own project outputs
CREATE POLICY "Users can view own project outputs"
ON public.project_outputs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects 
        WHERE projects.id = project_outputs.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- 2. Allow users to DELETE their own project outputs
CREATE POLICY "Users can delete own project outputs"
ON public.project_outputs
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects 
        WHERE projects.id = project_outputs.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- 3. Allow users to UPDATE their own project outputs (e.g. for is_current or title)
CREATE POLICY "Users can update own project outputs"
ON public.project_outputs
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects 
        WHERE projects.id = project_outputs.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- 4. Allow service_role to do EVERYTHING
CREATE POLICY "Service role has full access to project_outputs"
ON public.project_outputs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
