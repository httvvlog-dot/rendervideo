-- Fix RLS policy and Table Grants for project_scenes to ensure UI visibility

-- 1. Ensure authenticated users have table-level SELECT privilege
GRANT SELECT ON public.project_scenes TO authenticated;

-- 2. Drop the existing policy to recreate it cleanly (forward-only fix)
DROP POLICY IF EXISTS "Users can view their project scenes" ON public.project_scenes;

-- 3. Create the correct policy for SELECT
CREATE POLICY "Users can view their project scenes"
    ON public.project_scenes
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_scenes.project_id
        AND p.user_id = auth.uid()
    ));

-- Note: We also ensure UPDATE and DELETE policies exist for full UI functionality
DROP POLICY IF EXISTS "Users can update their project scenes" ON public.project_scenes;
CREATE POLICY "Users can update their project scenes"
    ON public.project_scenes
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_scenes.project_id
        AND p.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete their project scenes" ON public.project_scenes;
CREATE POLICY "Users can delete their project scenes"
    ON public.project_scenes
    FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_scenes.project_id
        AND p.user_id = auth.uid()
    ));

-- Ensure RLS is actually enabled on the table
ALTER TABLE public.project_scenes ENABLE ROW LEVEL SECURITY;
