-- 1. Create image_prompt_domains table
CREATE TABLE IF NOT EXISTS public.image_prompt_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    system_prompt TEXT,
    negative_prompt_template JSONB,
    camera_style TEXT,
    lighting_style TEXT,
    composition_style TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for image_prompt_domains
ALTER TABLE public.image_prompt_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to image_prompt_domains"
    ON public.image_prompt_domains
    FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Allow admin full access to image_prompt_domains"
    ON public.image_prompt_domains
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- 2. Alter script_sections negative_prompt to JSONB
-- Note: Safely dropping and recreating as JSONB since it was just added in the previous migration and holds no real data yet in production
ALTER TABLE public.script_sections DROP COLUMN IF EXISTS negative_prompt;
ALTER TABLE public.script_sections ADD COLUMN negative_prompt JSONB;

-- 3. Update save_script_with_sections RPC to handle JSONB negative_prompt
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
    SELECT user_id INTO v_user_id FROM public.projects WHERE id = p_project_id;
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Project not found'; END IF;
    IF v_user_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized: You do not own this project'; END IF;

    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version 
    FROM public.scripts WHERE project_id = p_project_id;

    INSERT INTO public.scripts (
        project_id, content, word_count, version, 
        provider, model, prompt, tokens_input, tokens_output, cost, latency_ms
    ) VALUES (
        p_project_id, p_content, p_word_count, v_next_version,
        p_provider, p_model, p_prompt, p_tokens_input, p_tokens_output, p_cost, p_latency_ms
    ) RETURNING id INTO v_script_id;

    FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
        INSERT INTO public.script_sections (
            script_id, project_id, section_index, title, narration, duration_seconds, 
            visual_description, image_prompt, negative_prompt, recommended_image_count, keywords
        ) VALUES (
            v_script_id,
            p_project_id,
            (v_section->>'section_index')::INTEGER,
            v_section->>'title',
            v_section->>'narration',
            (v_section->>'duration_seconds')::INTEGER,
            v_section->>'visual_description',
            v_section->>'image_prompt',
            (v_section->'negative_prompt')::JSONB,
            COALESCE((v_section->>'recommended_image_count')::INTEGER, 1),
            ARRAY(SELECT jsonb_array_elements_text(v_section->'keywords'))
        );
    END LOOP;

    RETURN jsonb_build_object('script_id', v_script_id, 'version', v_next_version);
END;
$$;

ALTER FUNCTION public.save_script_with_sections(
    p_project_id UUID, p_content TEXT, p_word_count INTEGER, p_provider TEXT,
    p_model TEXT, p_prompt TEXT, p_tokens_input INTEGER, p_tokens_output INTEGER,
    p_cost NUMERIC, p_latency_ms INTEGER, p_sections JSONB
) SET search_path = public, pg_temp;