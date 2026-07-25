-- Migration: Thêm các nhà cung cấp tạo ảnh vào bảng providers

-- 1. Insert Image Providers (OpenAI, Fal.ai, Replicate, Stability, Ideogram)
INSERT INTO public.providers (provider_type, provider_name, provider_key, description, icon_name)
VALUES
  ('image', 'OpenAI', 'openai', 'OpenAI DALL-E image generation models', 'openai'),
  ('image', 'Fal.ai', 'falai', 'Fast inference for FLUX and other diffusion models', 'falai'),
  ('image', 'Replicate', 'replicate', 'Run open source models via Replicate', 'replicate'),
  ('image', 'Stability AI', 'stability', 'Stable Diffusion and related models', 'stability'),
  ('image', 'Ideogram', 'ideogram', 'Ideogram models with high typography capability', 'ideogram')
ON CONFLICT (provider_key) DO UPDATE SET 
  provider_type = EXCLUDED.provider_type,
  provider_name = EXCLUDED.provider_name,
  description = EXCLUDED.description;
