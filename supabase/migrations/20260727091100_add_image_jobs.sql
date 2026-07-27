-- Add new ENUMs for image jobs
CREATE TYPE public.image_job_mode AS ENUM (
    'TEXT_TO_IMAGE',
    'IMAGE_TO_IMAGE',
    'UPSCALE',
    'INPAINT',
    'OUTPAINT',
    'BACKGROUND_REMOVE',
    'CHARACTER_REFERENCE'
);

CREATE TYPE public.image_job_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

-- Create image_jobs table
CREATE TABLE IF NOT EXISTS public.image_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.script_sections(id) ON DELETE SET NULL,
    mode public.image_job_mode NOT NULL DEFAULT 'TEXT_TO_IMAGE',
    provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
    model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
    credential_id UUID REFERENCES public.provider_credentials(id) ON DELETE SET NULL,
    status public.image_job_status NOT NULL DEFAULT 'PENDING',
    input_source VARCHAR(50) DEFAULT 'SCRIPT',
    original_prompt TEXT,
    validated_prompt TEXT,
    reference_images JSONB DEFAULT '[]'::jsonb,
    provider_request JSONB DEFAULT '{}'::jsonb,
    provider_response JSONB DEFAULT '{}'::jsonb,
    output_image_url TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own image jobs" ON public.image_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image jobs" ON public.image_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image jobs" ON public.image_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin has full access to image jobs" ON public.image_jobs
    FOR ALL USING (public.is_admin());

-- Add triggers for updated_at
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.image_jobs
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
