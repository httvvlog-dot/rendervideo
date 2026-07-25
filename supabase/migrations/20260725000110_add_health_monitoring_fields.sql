-- Bổ sung các trường giám sát sức khỏe và hạn mức (Health Monitoring & Quotas)
-- vào bảng provider_credentials

ALTER TABLE public.provider_credentials
ADD COLUMN IF NOT EXISTS last_success_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_failure_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS consecutive_failures integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_limit integer,
ADD COLUMN IF NOT EXISTS monthly_limit integer;
