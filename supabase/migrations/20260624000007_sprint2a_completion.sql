-- Replace project status with enum
CREATE TYPE public.project_status AS ENUM ('draft', 'queued', 'researching', 'scripting', 'voicing', 'rendering', 'completed', 'failed', 'cancelled');

ALTER TABLE public.projects ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.projects ALTER COLUMN status TYPE public.project_status USING status::public.project_status;
ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'draft'::public.project_status;

-- Add workflow_state to projects
ALTER TABLE public.projects ADD COLUMN workflow_state jsonb DEFAULT '{"research": "pending", "script": "pending", "scene": "pending", "voice": "pending", "subtitle": "pending", "render": "pending"}'::jsonb;

-- Providers soft delete
ALTER TABLE public.providers ADD COLUMN deleted_at timestamp with time zone;
