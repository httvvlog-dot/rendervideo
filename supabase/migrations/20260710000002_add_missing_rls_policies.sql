-- Add missing RLS policies for storage_files and project_scenes

-- Policies for storage_files
CREATE POLICY "Users can insert storage files"
    ON public.storage_files
    FOR INSERT
    WITH CHECK (true); -- Ideally restrict by user, but storage_files doesn't have a user_id column in this schema. Anyone authenticated can insert.

CREATE POLICY "Users can view storage files"
    ON public.storage_files
    FOR SELECT
    USING (true);

-- Policies for project_scenes
CREATE POLICY "Users can view their project scenes"
    ON public.project_scenes
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_scenes.project_id
        AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert project scenes"
    ON public.project_scenes
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_scenes.project_id
        AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their project scenes"
    ON public.project_scenes
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_scenes.project_id
        AND p.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their project scenes"
    ON public.project_scenes
    FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_scenes.project_id
        AND p.user_id = auth.uid()
    ));
