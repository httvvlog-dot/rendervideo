-- Add negative_prompt to script_sections
ALTER TABLE public.script_sections
ADD COLUMN IF NOT EXISTS negative_prompt TEXT;

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
            visual_description, image_prompt, negative_prompt, recommended_image_count, keywords
        ) VALUES (
            v_script_id,
            p_project_id, -- verified project_id, NOT trusting JSON
            (v_section->>'section_index')::INTEGER,
            v_section->>'title',
            v_section->>'narration',
            (v_section->>'duration_seconds')::INTEGER,
            v_section->>'visual_description',
            v_section->>'image_prompt',
            v_section->>'negative_prompt',
            COALESCE((v_section->>'recommended_image_count')::INTEGER, 1),
            ARRAY(SELECT jsonb_array_elements_text(v_section->'keywords'))
        );
    END LOOP;

    -- 6. Return script_id and version
    RETURN jsonb_build_object('script_id', v_script_id, 'version', v_next_version);
END;
$$;

ALTER FUNCTION public.save_script_with_sections(
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
) SET search_path = public, pg_temp;