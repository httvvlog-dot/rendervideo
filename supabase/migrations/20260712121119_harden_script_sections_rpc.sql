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
