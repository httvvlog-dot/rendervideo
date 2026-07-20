COMMIT;

-- 1. ADD RESERVED CREDITS TO WALLETS
ALTER TABLE public.wallets
ADD COLUMN IF NOT EXISTS reserved_credits BIGINT DEFAULT 0;

-- 2. ALTER WALLET TRANSACTIONS
ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'COMPLETED';

-- 3. ALTER PROVIDER COST LOGS
ALTER TABLE public.provider_cost_logs
ADD COLUMN IF NOT EXISTS wallet_transaction_id UUID REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pricing_version VARCHAR(50);

-- 4. CREATE WALLET RESERVATIONS
CREATE TABLE IF NOT EXISTS public.wallet_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    wallet_transaction_id UUID REFERENCES public.wallet_transactions(id) ON DELETE CASCADE,
    bucket_id UUID REFERENCES public.wallet_credit_buckets(id) ON DELETE CASCADE,
    reserved_amount BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, COMMITTED, RELEASED
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.wallet_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only wallet reservations" ON public.wallet_reservations 
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);

-- 5. RPC: RESERVE CREDITS
CREATE OR REPLACE FUNCTION reserve_credits(
    p_user_id UUID,
    p_amount BIGINT,
    p_feature VARCHAR,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_provider VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_timeout_minutes INT DEFAULT 15
) RETURNS TABLE (success BOOLEAN, transaction_id UUID, available_credits BIGINT) AS $$
DECLARE
    v_wallet_id UUID;
    v_balance_credits BIGINT;
    v_reserved_credits BIGINT;
    v_available_credits BIGINT;
    v_transaction_id UUID;
    v_remaining_reserve BIGINT := p_amount;
    v_bucket_id UUID;
    v_bucket_balance BIGINT;
    v_type public.transaction_type := 'USAGE';
BEGIN
    -- 1. Lock wallet
    SELECT id, balance_credits, reserved_credits INTO v_wallet_id, v_balance_credits, v_reserved_credits
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::BIGINT;
        RETURN;
    END IF;

    v_available_credits := v_balance_credits - v_reserved_credits;

    IF v_available_credits < p_amount THEN
        RETURN QUERY SELECT false, NULL::UUID, v_available_credits;
        RETURN;
    END IF;

    -- 2. Map feature to transaction type
    IF p_feature = 'Voice' THEN v_type := 'VOICE_GENERATION';
    ELSIF p_feature = 'Image' THEN v_type := 'IMAGE_GENERATION';
    ELSIF p_feature = 'Render' THEN v_type := 'VIDEO_RENDER';
    ELSIF p_feature = 'Script' THEN v_type := 'SCRIPT_GENERATION';
    END IF;

    -- 3. Create Pending Transaction
    INSERT INTO public.wallet_transactions (
        wallet_id, user_id, transaction_type, amount, balance_before, balance_after,
        feature, reference_type, reference_id, provider, description, metadata, status
    ) VALUES (
        v_wallet_id, p_user_id, v_type, -p_amount, v_balance_credits, v_balance_credits, -- balance_after remains same until commit
        p_feature, p_reference_type, p_reference_id, p_provider, p_description, p_metadata, 'PENDING'
    ) RETURNING id INTO v_transaction_id;

    -- 4. Create Reservations from Buckets
    -- We must conceptually find buckets to reserve from, taking into account OTHER active reservations
    FOR v_bucket_id, v_bucket_balance IN 
        SELECT b.id, b.balance - COALESCE(SUM(r.reserved_amount), 0) as available_bucket_balance
        FROM public.wallet_credit_buckets b
        LEFT JOIN public.wallet_reservations r ON r.bucket_id = b.id AND r.status = 'ACTIVE'
        WHERE b.wallet_id = v_wallet_id AND (b.expires_at IS NULL OR b.expires_at > NOW())
        GROUP BY b.id, b.balance, b.expires_at
        HAVING b.balance - COALESCE(SUM(r.reserved_amount), 0) > 0
        ORDER BY 
            CASE WHEN b.expires_at IS NOT NULL THEN 0 ELSE 1 END,
            b.expires_at ASC
        FOR UPDATE OF b
    LOOP
        IF v_remaining_reserve = 0 THEN EXIT; END IF;

        IF v_bucket_balance >= v_remaining_reserve THEN
            INSERT INTO public.wallet_reservations (wallet_id, wallet_transaction_id, bucket_id, reserved_amount, expires_at)
            VALUES (v_wallet_id, v_transaction_id, v_bucket_id, v_remaining_reserve, NOW() + (p_timeout_minutes || ' minutes')::INTERVAL);
            v_remaining_reserve := 0;
        ELSE
            INSERT INTO public.wallet_reservations (wallet_id, wallet_transaction_id, bucket_id, reserved_amount, expires_at)
            VALUES (v_wallet_id, v_transaction_id, v_bucket_id, v_bucket_balance, NOW() + (p_timeout_minutes || ' minutes')::INTERVAL);
            v_remaining_reserve := v_remaining_reserve - v_bucket_balance;
        END IF;
    END LOOP;

    -- 5. Update Wallet
    UPDATE public.wallets 
    SET reserved_credits = reserved_credits + p_amount, updated_at = NOW()
    WHERE id = v_wallet_id;

    RETURN QUERY SELECT true, v_transaction_id, (v_available_credits - p_amount);
END;
$$ LANGUAGE plpgsql;

-- 6. RPC: COMMIT CREDITS
CREATE OR REPLACE FUNCTION commit_credits(
    p_transaction_id UUID,
    p_provider_metadata JSONB DEFAULT NULL,
    p_actual_usd_cost DECIMAL(10,6) DEFAULT NULL,
    p_model VARCHAR DEFAULT NULL,
    p_pricing_version VARCHAR DEFAULT NULL,
    p_project_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_wallet_id UUID;
    v_user_id UUID;
    v_amount BIGINT;
    v_status VARCHAR(50);
    v_provider VARCHAR;
    v_feature VARCHAR;
    v_bucket_id UUID;
    v_res_amount BIGINT;
    v_total_balance BIGINT;
BEGIN
    -- 1. Lock Transaction
    SELECT wallet_id, user_id, amount, status, provider, feature 
    INTO v_wallet_id, v_user_id, v_amount, v_status, v_provider, v_feature
    FROM public.wallet_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF v_status != 'PENDING' THEN RETURN false; END IF;

    -- 2. Lock Wallet
    PERFORM id FROM public.wallets WHERE id = v_wallet_id FOR UPDATE;

    -- 3. Process Reservations
    FOR v_bucket_id, v_res_amount IN
        SELECT bucket_id, reserved_amount 
        FROM public.wallet_reservations
        WHERE wallet_transaction_id = p_transaction_id AND status = 'ACTIVE'
        FOR UPDATE
    LOOP
        -- Deduct from bucket actually
        UPDATE public.wallet_credit_buckets SET balance = balance - v_res_amount WHERE id = v_bucket_id;
        -- Mark reservation COMMITTED
        UPDATE public.wallet_reservations SET status = 'COMMITTED' WHERE wallet_transaction_id = p_transaction_id AND bucket_id = v_bucket_id;
    END LOOP;

    -- 4. Calculate actual new balance for transaction log
    SELECT COALESCE(SUM(balance), 0) INTO v_total_balance 
    FROM public.wallet_credit_buckets 
    WHERE wallet_id = v_wallet_id AND (expires_at IS NULL OR expires_at > NOW());

    -- 5. Update Wallet
    -- v_amount is negative in transaction table (e.g., -50). We use ABS(v_amount) to add to consumed.
    UPDATE public.wallets 
    SET 
        balance_credits = v_total_balance,
        reserved_credits = GREATEST(0, reserved_credits - ABS(v_amount)),
        lifetime_used = lifetime_used + ABS(v_amount),
        total_consumed_credits = total_consumed_credits + ABS(v_amount),
        updated_at = NOW()
    WHERE id = v_wallet_id;

    -- 6. Update Transaction
    UPDATE public.wallet_transactions
    SET status = 'COMPLETED', balance_after = v_total_balance
    WHERE id = p_transaction_id;

    -- 7. Log Provider Cost if provided
    IF p_actual_usd_cost IS NOT NULL THEN
        INSERT INTO public.provider_cost_logs (
            user_id, project_id, provider, model, request_type, usd_cost, usage_metadata, pricing_version, wallet_transaction_id
        ) VALUES (
            v_user_id, p_project_id, COALESCE(p_provider, v_provider), COALESCE(p_model, 'unknown'), v_feature, p_actual_usd_cost, p_provider_metadata, p_pricing_version, p_transaction_id
        );
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 7. RPC: RELEASE CREDITS
CREATE OR REPLACE FUNCTION release_credits(
    p_transaction_id UUID,
    p_reason TEXT DEFAULT 'Released manually'
) RETURNS BOOLEAN AS $$
DECLARE
    v_wallet_id UUID;
    v_amount BIGINT;
    v_status VARCHAR(50);
BEGIN
    -- 1. Lock Transaction
    SELECT wallet_id, amount, status INTO v_wallet_id, v_amount, v_status
    FROM public.wallet_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF v_status != 'PENDING' THEN RETURN false; END IF;

    -- 2. Lock Wallet
    PERFORM id FROM public.wallets WHERE id = v_wallet_id FOR UPDATE;

    -- 3. Update Reservations to RELEASED
    UPDATE public.wallet_reservations 
    SET status = 'RELEASED' 
    WHERE wallet_transaction_id = p_transaction_id AND status = 'ACTIVE';

    -- 4. Update Wallet (Free up reserved credits)
    UPDATE public.wallets 
    SET 
        reserved_credits = GREATEST(0, reserved_credits - ABS(v_amount)),
        updated_at = NOW()
    WHERE id = v_wallet_id;

    -- 5. Update Transaction
    UPDATE public.wallet_transactions
    SET status = 'CANCELLED', description = COALESCE(description, '') || ' | ' || p_reason
    WHERE id = p_transaction_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 8. RPC: RELEASE EXPIRED RESERVATIONS
CREATE OR REPLACE FUNCTION release_expired_reservations() RETURNS INT AS $$
DECLARE
    v_tx_id UUID;
    v_count INT := 0;
BEGIN
    FOR v_tx_id IN 
        SELECT DISTINCT wallet_transaction_id 
        FROM public.wallet_reservations 
        WHERE status = 'ACTIVE' AND expires_at < NOW()
    LOOP
        PERFORM release_credits(v_tx_id, 'EXPIRED_TIMEOUT');
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 9. RPC: GRANT CREDITS (Admin / Purchase)
CREATE OR REPLACE FUNCTION grant_credits(
    p_user_id UUID,
    p_amount BIGINT,
    p_bucket_type VARCHAR DEFAULT 'PURCHASED',
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_description TEXT DEFAULT 'Credits granted',
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_wallet_id UUID;
    v_total_balance BIGINT;
BEGIN
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF v_wallet_id IS NULL THEN RETURN false; END IF;

    INSERT INTO public.wallet_credit_buckets (wallet_id, bucket_type, balance, expires_at)
    VALUES (v_wallet_id, p_bucket_type, p_amount, p_expires_at);

    SELECT COALESCE(SUM(balance), 0) INTO v_total_balance 
    FROM public.wallet_credit_buckets 
    WHERE wallet_id = v_wallet_id AND (expires_at IS NULL OR expires_at > NOW());

    INSERT INTO public.wallet_transactions (
        wallet_id, user_id, transaction_type, amount, balance_before, balance_after,
        reference_type, reference_id, description, status
    ) VALUES (
        v_wallet_id, p_user_id, 'PURCHASE', p_amount, v_total_balance - p_amount, v_total_balance,
        p_reference_type, p_reference_id, p_description, 'COMPLETED'
    );

    UPDATE public.wallets 
    SET 
        balance_credits = v_total_balance,
        total_purchased_credits = total_purchased_credits + p_amount,
        lifetime_earned = lifetime_earned + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 10. RPC: EXPIRE CREDITS
CREATE OR REPLACE FUNCTION expire_credits() RETURNS INT AS $$
DECLARE
    v_bucket_id UUID;
    v_wallet_id UUID;
    v_balance BIGINT;
    v_count INT := 0;
BEGIN
    FOR v_bucket_id, v_wallet_id, v_balance IN 
        SELECT id, wallet_id, balance 
        FROM public.wallet_credit_buckets 
        WHERE balance > 0 AND expires_at < NOW()
    LOOP
        UPDATE public.wallet_credit_buckets SET balance = 0 WHERE id = v_bucket_id;
        
        INSERT INTO public.wallet_transactions (
            wallet_id, transaction_type, amount, balance_before, balance_after,
            description, status
        ) VALUES (
            v_wallet_id, 'EXPIRED', -v_balance, 
            (SELECT balance_credits FROM public.wallets WHERE id = v_wallet_id),
            (SELECT balance_credits - v_balance FROM public.wallets WHERE id = v_wallet_id),
            'Bucket expired', 'COMPLETED'
        );

        UPDATE public.wallets 
        SET balance_credits = balance_credits - v_balance, updated_at = NOW()
        WHERE id = v_wallet_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 11. RPC: ADMIN ADJUST CREDITS
CREATE OR REPLACE FUNCTION admin_adjust_credits(
    p_user_id UUID,
    p_amount BIGINT,
    p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_wallet_id UUID;
    v_total_balance BIGINT;
BEGIN
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF v_wallet_id IS NULL THEN RETURN false; END IF;

    -- For simplicity, if admin reduces credits, we just create a negative compensation bucket
    -- In real life, it would deduct from active buckets similar to usage.
    INSERT INTO public.wallet_credit_buckets (wallet_id, bucket_type, balance, expires_at)
    VALUES (v_wallet_id, 'COMPENSATION', p_amount, NULL);

    SELECT COALESCE(SUM(balance), 0) INTO v_total_balance 
    FROM public.wallet_credit_buckets 
    WHERE wallet_id = v_wallet_id AND (expires_at IS NULL OR expires_at > NOW());

    INSERT INTO public.wallet_transactions (
        wallet_id, user_id, transaction_type, amount, balance_before, balance_after,
        description, status
    ) VALUES (
        v_wallet_id, p_user_id, 'ADMIN_ADJUSTMENT', p_amount, v_total_balance - p_amount, v_total_balance,
        p_description, 'COMPLETED'
    );

    UPDATE public.wallets 
    SET 
        balance_credits = v_total_balance,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;
