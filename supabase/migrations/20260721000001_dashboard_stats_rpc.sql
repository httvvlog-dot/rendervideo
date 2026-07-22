COMMIT;

-- 1. Create Enum Type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_lifecycle_state') THEN
        CREATE TYPE public.project_lifecycle_state AS ENUM ('DRAFT', 'RENDERING', 'COMPLETED', 'FAILED', 'ARCHIVED');
    END IF;
END$$;

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_project_outputs_proj_status ON public.project_outputs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_render_jobs_proj_status ON public.render_jobs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_user_created ON public.projects(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_outputs_proj_created ON public.project_outputs(project_id, created_at DESC);

-- 3. View
CREATE OR REPLACE VIEW public.vw_project_lifecycle_status AS
WITH RenderStats AS (
    SELECT project_id,
           MAX(created_at) as last_render_at,
           COUNT(*) as total_renders,
           COUNT(*) FILTER (WHERE status = 'failed') as failed_renders,
           MAX(progress) FILTER (WHERE status IN ('pending', 'processing', 'running')) as current_progress
    FROM public.render_jobs
    GROUP BY project_id
),
OutputStats AS (
    SELECT project_id,
           MAX(created_at) as last_completed_at,
           COUNT(*) as total_outputs,
           COUNT(*) FILTER (WHERE status = 'completed') as successful_outputs,
           COUNT(*) FILTER (WHERE status = 'failed') as failed_outputs
    FROM public.project_outputs
    GROUP BY project_id
),
LatestOutput AS (
    SELECT DISTINCT ON (project_id) 
           project_id,
           id as last_successful_output_id,
           created_at as last_successful_output_created_at,
           output_url as thumbnail_url, -- Use output_url as preview/thumbnail
           duration_ms as latest_output_duration,
           width || 'x' || height as latest_resolution
    FROM public.project_outputs
    WHERE status = 'completed'
    ORDER BY project_id, created_at DESC
)
SELECT 
    p.id as project_id,
    p.user_id,
    p.title,
    p.created_at,
    CASE 
        WHEN p.status::text = 'archived' THEN 'ARCHIVED'::public.project_lifecycle_state
        WHEN EXISTS (SELECT 1 FROM public.render_jobs rj WHERE rj.project_id = p.id AND rj.status IN ('pending', 'processing', 'running')) THEN 'RENDERING'::public.project_lifecycle_state
        WHEN os.successful_outputs > 0 THEN 'COMPLETED'::public.project_lifecycle_state
        WHEN rs.failed_renders > 0 AND COALESCE(os.successful_outputs, 0) = 0 THEN 'FAILED'::public.project_lifecycle_state
        ELSE 'DRAFT'::public.project_lifecycle_state
    END as lifecycle_status,
    rs.last_render_at,
    os.last_completed_at,
    COALESCE(rs.current_progress, 0) as current_progress,
    COALESCE(os.total_outputs, 0) as total_outputs,
    COALESCE(os.successful_outputs, 0) as successful_outputs,
    COALESCE(os.failed_outputs, 0) as failed_outputs,
    lo.last_successful_output_id,
    lo.last_successful_output_created_at,
    lo.thumbnail_url,
    lo.latest_output_duration,
    lo.latest_resolution
FROM public.projects p
LEFT JOIN RenderStats rs ON p.id = rs.project_id
LEFT JOIN OutputStats os ON p.id = os.project_id
LEFT JOIN LatestOutput lo ON p.id = lo.project_id;


-- 4. RPC
CREATE OR REPLACE FUNCTION public.get_user_project_statistics(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH Stats AS (
        SELECT 
            COUNT(*) as total_projects,
            COUNT(*) FILTER (WHERE lifecycle_status = 'DRAFT') as draft_projects,
            COUNT(*) FILTER (WHERE lifecycle_status = 'RENDERING') as rendering_projects,
            COUNT(*) FILTER (WHERE lifecycle_status = 'COMPLETED') as completed_projects,
            COUNT(*) FILTER (WHERE lifecycle_status = 'FAILED') as failed_projects,
            COUNT(*) FILTER (WHERE lifecycle_status = 'ARCHIVED') as archived_projects,
            MAX(created_at) as last_project_created_at,
            MAX(last_render_at) as last_render_at,
            MAX(last_completed_at) as last_completed_at,
            COALESCE(SUM(total_outputs), 0) as total_outputs,
            COALESCE(SUM(successful_outputs), 0) as successful_outputs,
            COALESCE(SUM(failed_outputs), 0) as failed_outputs
        FROM public.vw_project_lifecycle_status
        WHERE p_user_id IS NULL OR user_id = p_user_id
    )
    SELECT jsonb_build_object(
        'summary', jsonb_build_object(
            'total', total_projects,
            'draft', draft_projects,
            'rendering', rendering_projects,
            'completed', completed_projects,
            'failed', failed_projects,
            'archived', archived_projects
        ),
        'metrics', jsonb_build_object(
            'completed_percentage', CASE WHEN total_projects > 0 THEN ROUND((completed_projects::numeric / total_projects::numeric) * 100, 2) ELSE 0 END,
            'total_outputs', total_outputs,
            'successful_outputs', successful_outputs,
            'failed_outputs', failed_outputs,
            'last_render_at', last_render_at,
            'last_completed_at', last_completed_at,
            'last_project_created_at', last_project_created_at
        )
    ) INTO v_result
    FROM Stats;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
