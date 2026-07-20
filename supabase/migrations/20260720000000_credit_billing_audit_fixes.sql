COMMIT;

-- 1. ALTER ENUM transaction_type
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'VOICE_GENERATION';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'IMAGE_GENERATION';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'VIDEO_RENDER';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'SCRIPT_GENERATION';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'EXPORT';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'ADMIN_ADJUSTMENT';

-- 2. ALTER wallets
ALTER TABLE public.wallets
ADD COLUMN IF NOT EXISTS balance_credits BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_purchased_credits BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bonus_credits BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_consumed_credits BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

-- 3. ALTER wallet_transactions
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS balance_before BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS reference_id UUID,
ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 4. CREATE provider_cost_logs
CREATE TABLE IF NOT EXISTS public.provider_cost_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    usd_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    usage_metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for provider_cost_logs
ALTER TABLE public.provider_cost_logs ENABLE ROW LEVEL SECURITY;
-- Internal only
CREATE POLICY "Admin only provider cost" ON public.provider_cost_logs 
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

-- 5. ATOMIC CREDIT DEDUCTION RPC
CREATE OR REPLACE FUNCTION atomic_credit_deduction(
    p_user_id UUID,
    p_amount BIGINT,
    p_feature VARCHAR,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_provider VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, balance_after BIGINT) AS $$
DECLARE
    v_wallet_id UUID;
    v_balance_before BIGINT;
    v_total_available BIGINT;
    v_remaining_charge BIGINT := p_amount;
    v_bucket_id UUID;
    v_bucket_balance BIGINT;
    v_type public.transaction_type := 'USAGE';
BEGIN
    -- 1. Lock wallet row
    SELECT id, balance_credits INTO v_wallet_id, v_balance_before
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN QUERY SELECT false, 0::BIGINT;
        RETURN;
    END IF;

    -- 2. Verify total available balance from buckets just to be absolutely sure (source of truth)
    SELECT COALESCE(SUM(balance), 0) INTO v_total_available 
    FROM public.wallet_credit_buckets 
    WHERE wallet_id = v_wallet_id AND (expires_at IS NULL OR expires_at > NOW());

    IF v_total_available < p_amount THEN
        -- Fix the cache if it was desynchronized
        IF v_balance_before != v_total_available THEN
            UPDATE public.wallets SET balance_credits = v_total_available WHERE id = v_wallet_id;
        END IF;
        RETURN QUERY SELECT false, v_total_available;
        RETURN;
    END IF;

    -- 3. Deduct from expiring buckets first, ordered by expiration date, then non-expiring
    FOR v_bucket_id, v_bucket_balance IN 
        SELECT id, balance 
        FROM public.wallet_credit_buckets 
        WHERE wallet_id = v_wallet_id AND balance > 0 AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY 
            CASE WHEN expires_at IS NOT NULL THEN 0 ELSE 1 END,
            expires_at ASC
        FOR UPDATE
    LOOP
        IF v_remaining_charge = 0 THEN
            EXIT;
        END IF;

        IF v_bucket_balance >= v_remaining_charge THEN
            UPDATE public.wallet_credit_buckets SET balance = balance - v_remaining_charge WHERE id = v_bucket_id;
            v_remaining_charge := 0;
        ELSE
            UPDATE public.wallet_credit_buckets SET balance = 0 WHERE id = v_bucket_id;
            v_remaining_charge := v_remaining_charge - v_bucket_balance;
        END IF;
    END LOOP;

    -- 4. Map feature to transaction type (fallback to USAGE)
    IF p_feature = 'Voice' THEN v_type := 'VOICE_GENERATION';
    ELSIF p_feature = 'Image' THEN v_type := 'IMAGE_GENERATION';
    ELSIF p_feature = 'Render' THEN v_type := 'VIDEO_RENDER';
    ELSIF p_feature = 'Script' THEN v_type := 'SCRIPT_GENERATION';
    END IF;

    -- 5. Insert Ledger
    INSERT INTO public.wallet_transactions (
        wallet_id, user_id, transaction_type, amount, balance_before, balance_after,
        feature, reference_type, reference_id, provider, description, metadata
    ) VALUES (
        v_wallet_id, p_user_id, v_type, -p_amount, v_total_available, v_total_available - p_amount,
        p_feature, p_reference_type, p_reference_id, p_provider, p_description, p_metadata
    );

    -- 6. Update Wallet Cache
    UPDATE public.wallets 
    SET 
        balance_credits = v_total_available - p_amount,
        lifetime_used = lifetime_used + p_amount,
        total_consumed_credits = total_consumed_credits + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    RETURN QUERY SELECT true, (v_total_available - p_amount);
END;
$$ LANGUAGE plpgsql;

-- 6. REFUND CREDITS RPC (In case AI fails)
CREATE OR REPLACE FUNCTION refund_credits(
    p_user_id UUID,
    p_amount BIGINT,
    p_feature VARCHAR,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_provider VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT 'Refund for failed generation',
    p_metadata JSONB DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, balance_after BIGINT) AS $$
DECLARE
    v_wallet_id UUID;
    v_balance_before BIGINT;
    v_total_available BIGINT;
    v_bucket_id UUID;
BEGIN
    -- 1. Lock wallet row
    SELECT id, balance_credits INTO v_wallet_id, v_balance_before
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN QUERY SELECT false, 0::BIGINT;
        RETURN;
    END IF;

    -- 2. Add refund to a non-expiring COMPENSATION bucket
    -- Check if a non-expiring COMPENSATION bucket exists
    SELECT id INTO v_bucket_id
    FROM public.wallet_credit_buckets
    WHERE wallet_id = v_wallet_id AND bucket_type = 'COMPENSATION' AND expires_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_bucket_id IS NOT NULL THEN
        UPDATE public.wallet_credit_buckets SET balance = balance + p_amount WHERE id = v_bucket_id;
    ELSE
        INSERT INTO public.wallet_credit_buckets (wallet_id, bucket_type, balance)
        VALUES (v_wallet_id, 'COMPENSATION', p_amount);
    END IF;

    -- Calculate total
    SELECT COALESCE(SUM(balance), 0) INTO v_total_available 
    FROM public.wallet_credit_buckets 
    WHERE wallet_id = v_wallet_id AND (expires_at IS NULL OR expires_at > NOW());

    -- 3. Insert Ledger
    INSERT INTO public.wallet_transactions (
        wallet_id, user_id, transaction_type, amount, balance_before, balance_after,
        feature, reference_type, reference_id, provider, description, metadata
    ) VALUES (
        v_wallet_id, p_user_id, 'REFUND', p_amount, v_balance_before, v_total_available,
        p_feature, p_reference_type, p_reference_id, p_provider, p_description, p_metadata
    );

    -- 4. Update Wallet Cache
    UPDATE public.wallets 
    SET 
        balance_credits = v_total_available,
        lifetime_used = GREATEST(0, lifetime_used - p_amount),
        total_consumed_credits = GREATEST(0, total_consumed_credits - p_amount),
        updated_at = NOW()
    WHERE id = v_wallet_id;

    RETURN QUERY SELECT true, v_total_available;
END;
$$ LANGUAGE plpgsql;

-- 7. INITIALIZE CACHE
UPDATE public.wallets w
SET balance_credits = (
    SELECT COALESCE(SUM(balance), 0)
    FROM public.wallet_credit_buckets b
    WHERE b.wallet_id = w.id AND (b.expires_at IS NULL OR b.expires_at > NOW())
);
