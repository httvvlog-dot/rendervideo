-- Fix RLS for render_jobs

-- 1. Allow users to SELECT their own render jobs
CREATE POLICY "Users can view own render jobs"
ON public.render_jobs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects 
        WHERE projects.id = render_jobs.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- 2. Allow users to INSERT render jobs for their own projects
CREATE POLICY "Users can insert own render jobs"
ON public.render_jobs
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects 
        WHERE projects.id = render_jobs.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- 3. Allow service_role to do EVERYTHING
CREATE POLICY "Service role has full access to render_jobs"
ON public.render_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
