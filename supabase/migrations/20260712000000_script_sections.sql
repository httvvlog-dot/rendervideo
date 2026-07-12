-- 1. Create script_sections table
CREATE TABLE public.script_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    section_index INTEGER NOT NULL,
    title TEXT,
    narration TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    visual_description TEXT NOT NULL,
    image_prompt TEXT,
    recommended_image_count INTEGER NOT NULL DEFAULT 1 CHECK (recommended_image_count >= 1 AND recommended_image_count <= 20),
    keywords TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(script_id, section_index)
);

-- 2. Add indexes
CREATE INDEX idx_script_sections_script_id ON public.script_sections(script_id);
CREATE INDEX idx_script_sections_project_id ON public.script_sections(project_id);

-- 3. Add version unique constraint to scripts to prevent race conditions
ALTER TABLE public.scripts ADD CONSTRAINT unique_project_version UNIQUE (project_id, version);

-- 4. Enable RLS
ALTER TABLE public.script_sections ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS Policies for script_sections
CREATE POLICY "Users can view their own script sections" 
ON public.script_sections FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = script_sections.project_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can insert their own script sections" 
ON public.script_sections FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = script_sections.project_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can update their own script sections" 
ON public.script_sections FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = script_sections.project_id AND p.user_id = auth.uid())) 
WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = script_sections.project_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can delete their own script sections" 
ON public.script_sections FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = script_sections.project_id AND p.user_id = auth.uid()));

-- Also add explicit policies for scripts to be perfectly safe, as earlier migrations lacked explicit ones
CREATE POLICY "Users can view their scripts" 
ON public.scripts FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = scripts.project_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can insert their scripts" 
ON public.scripts FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = scripts.project_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can update their scripts" 
ON public.scripts FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = scripts.project_id AND p.user_id = auth.uid())) 
WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = scripts.project_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can delete their scripts" 
ON public.scripts FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = scripts.project_id AND p.user_id = auth.uid()));

-- 6. Atomic RPC for generating script with sections
CREATE OR REPLACE FUNCTION public.save_script_with_sections(
    p_project_id UUID,
    p_content TEXT,
    p_word_count INTEGER,
    p_provider TEXT,
    p_model TEXT,
    p_prompt TEXT,
    p_tokens_input INTEGER,
    p_tokens_output INTEGER,
    p_cost NUMERIC,
    p_latency_ms INTEGER,
    p_sections JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID;
    v_next_version INTEGER;
    v_script_id UUID;
    v_section JSONB;
BEGIN
    -- 1. Validate the authenticated user owns the project
    SELECT user_id INTO v_user_id FROM public.projects WHERE id = p_project_id;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Project not found';
    END IF;
    
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You do not own this project';
    END IF;

    -- 2. Lock or safely determine the next script version
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version 
    FROM public.scripts 
    WHERE project_id = p_project_id;

    -- 3. Insert the scripts row
    INSERT INTO public.scripts (
        project_id, content, word_count, version, 
        provider, model, prompt, tokens_input, tokens_output, cost, latency_ms
    ) VALUES (
        p_project_id, p_content, p_word_count, v_next_version,
        p_provider, p_model, p_prompt, p_tokens_input, p_tokens_output, p_cost, p_latency_ms
    ) RETURNING id INTO v_script_id;

    -- 4 & 5. Insert all script_sections
    FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
        INSERT INTO public.script_sections (
            script_id, project_id, section_index, title, narration, duration_seconds, 
            visual_description, image_prompt, recommended_image_count, keywords
        ) VALUES (
            v_script_id,
            p_project_id, -- verified project_id, NOT trusting JSON
            (v_section->>'section_index')::INTEGER,
            v_section->>'title',
            v_section->>'narration',
            (v_section->>'duration_seconds')::INTEGER,
            v_section->>'visual_description',
            v_section->>'image_prompt',
            COALESCE((v_section->>'recommended_image_count')::INTEGER, 1),
            ARRAY(SELECT jsonb_array_elements_text(v_section->'keywords'))
        );
    END LOOP;

    -- 6. Return script_id and version
    RETURN jsonb_build_object('script_id', v_script_id, 'version', v_next_version);
END;
$$;
