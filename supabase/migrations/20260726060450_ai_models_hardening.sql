-- Add new columns to ai_models
ALTER TABLE public.ai_models
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Create provider_health_view
CREATE OR REPLACE VIEW public.provider_health_view AS
SELECT 
    p.id AS provider_id,
    p.provider_name,
    p.provider_key,
    COUNT(c.id) AS credential_count,
    COUNT(c.id) FILTER (WHERE c.is_active = true) AS active_credential_count,
    MAX(c.last_success_at) AS last_success,
    MAX(c.last_failure_at) AS last_failure,
    CASE 
        WHEN COUNT(c.id) FILTER (WHERE c.is_active = true) > 0 THEN true 
        ELSE false 
    END AS is_healthy
FROM 
    public.providers p
LEFT JOIN 
    public.provider_credentials c ON p.id = c.provider_id
GROUP BY 
    p.id, p.provider_name, p.provider_key;
