-- Thêm các cột cho kiến trúc CredentialRuntime v4
-- 1. Bảng providers: Thêm capabilities
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '[]'::jsonb;

-- 2. Bảng provider_credentials: Rạch ròi Status & Metrics
ALTER TABLE provider_credentials 
ADD COLUMN IF NOT EXISTS credential_status VARCHAR(50) DEFAULT 'UNKNOWN',
ADD COLUMN IF NOT EXISTS runtime_status VARCHAR(50) DEFAULT 'UNKNOWN',
ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_latency INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS latency_sum BIGINT DEFAULT 0;

-- Migration data cho cột cũ (nếu có health_status)
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='provider_credentials' AND column_name='health_status') THEN
    UPDATE provider_credentials 
    SET runtime_status = 
      CASE 
        WHEN health_status = 'healthy' THEN 'HEALTHY'
        WHEN health_status = 'offline' THEN 'NETWORK_ERROR'
        WHEN health_status = 'rate_limited' THEN 'RATE_LIMITED'
        WHEN health_status = 'unauthorized' THEN 'UNAUTHORIZED'
        WHEN health_status = 'timeout' THEN 'TIMEOUT'
        ELSE 'UNKNOWN'
      END,
        credential_status = 
      CASE 
        WHEN health_status = 'healthy' THEN 'VALID'
        WHEN health_status = 'unauthorized' THEN 'INVALID'
        ELSE 'UNKNOWN'
      END;
  END IF;
END $$;
