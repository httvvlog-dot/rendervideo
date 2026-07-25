-- Add image_model to provider_credentials
ALTER TABLE provider_credentials 
ADD COLUMN IF NOT EXISTS image_model TEXT DEFAULT 'fal-ai/flux-pro/v1';
