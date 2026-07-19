-- 1. ENUMS
CREATE TYPE public.transaction_type AS ENUM (
    'PURCHASE', 'BONUS', 'REFUND', 'USAGE', 'ADMIN_GRANT', 'ADMIN_REMOVE', 'EXPIRED'
);

CREATE TYPE public.bucket_type AS ENUM (
    'PURCHASED', 'WELCOME_BONUS', 'PROMOTION', 'COMPENSATION', 'REFERRAL'
);

CREATE TYPE public.payment_status AS ENUM (
    'CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'
);

CREATE TYPE public.subscription_status AS ENUM (
    'ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING'
);

-- 2. WALLETS
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lifetime_earned BIGINT DEFAULT 0,
    lifetime_used BIGINT DEFAULT 0,
    lifetime_bonus BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.wallet_credit_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    bucket_type public.bucket_type NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    transaction_type public.transaction_type NOT NULL,
    amount BIGINT NOT NULL, -- Negative for USAGE, Positive for GRANT/PURCHASE
    balance_after BIGINT NOT NULL,
    feature VARCHAR(50), -- Script, Voice, Image, Render
    snapshot JSONB, -- { provider, model, provider_model_id, credit_rule_version, pricing_version, credits, api_cost, currency }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BILLING SETTINGS
CREATE TABLE IF NOT EXISTS public.billing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enable_welcome_bonus BOOLEAN DEFAULT false,
    welcome_bonus_credits INT DEFAULT 0,
    welcome_bonus_expiration_days INT DEFAULT 30,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default single row for billing settings
INSERT INTO public.billing_settings (enable_welcome_bonus, welcome_bonus_credits, welcome_bonus_expiration_days) 
VALUES (true, 50, 30);

-- 5. PRICING & RULES
CREATE TABLE IF NOT EXISTS public.provider_model_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    api_cost DECIMAL(10, 4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    pricing_type VARCHAR(50) DEFAULT 'per_unit',
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, model, version)
);

CREATE TABLE IF NOT EXISTS public.credit_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature VARCHAR(50) NOT NULL,
    provider_model_pricing_id UUID REFERENCES public.provider_model_pricing(id) ON DELETE CASCADE,
    credit_cost INT NOT NULL,
    version INT DEFAULT 1,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PACKAGES & PAYMENTS
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    price_vnd BIGINT NOT NULL,
    credits INT NOT NULL,
    bonus_credits INT DEFAULT 0,
    description TEXT,
    is_featured BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.credit_packages(id) ON DELETE SET NULL,
    amount_vnd BIGINT NOT NULL,
    status public.payment_status DEFAULT 'CREATED',
    payment_provider_id VARCHAR(50), -- references ProviderRuntime id later e.g. stripe, momo
    provider_transaction_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL,
    monthly_credit INT NOT NULL,
    status public.subscription_status DEFAULT 'ACTIVE',
    renewal_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PROJECT USAGE
CREATE TABLE IF NOT EXISTS public.project_usage (
    project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
    script_credits BIGINT DEFAULT 0,
    voice_credits BIGINT DEFAULT 0,
    image_credits BIGINT DEFAULT 0,
    render_credits BIGINT DEFAULT 0,
    total_credits BIGINT DEFAULT 0,
    api_cost_usd DECIMAL(10, 4) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. RLS POLICIES (Stub for essential ones)
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.wallet_credit_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own buckets" ON public.wallet_credit_buckets FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.wallets WHERE id = wallet_id AND user_id = auth.uid())
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.wallets WHERE id = wallet_id AND user_id = auth.uid())
);

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active credit packages" ON public.credit_packages FOR SELECT TO authenticated USING (is_active = true);

-- 9. STORED PROCEDURE FOR ATOMIC CHARGE (Prioritizing expiring bonuses)
CREATE OR REPLACE FUNCTION charge_wallet_buckets(p_user_id UUID, p_amount BIGINT)
RETURNS TABLE (success BOOLEAN, remaining_balance BIGINT) AS $$
DECLARE
    v_wallet_id UUID;
    v_remaining_charge BIGINT := p_amount;
    v_bucket_id UUID;
    v_bucket_balance BIGINT;
    v_total_balance BIGINT;
BEGIN
    -- Get or create wallet
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;
    IF v_wallet_id IS NULL THEN
        RETURN QUERY SELECT false, 0::BIGINT;
        RETURN;
    END IF;

    -- Calculate total balance
    SELECT COALESCE(SUM(balance), 0) INTO v_total_balance 
    FROM public.wallet_credit_buckets 
    WHERE wallet_id = v_wallet_id AND (expires_at IS NULL OR expires_at > NOW());

    IF v_total_balance < p_amount THEN
        RETURN QUERY SELECT false, v_total_balance;
        RETURN;
    END IF;

    -- Deduct from expiring buckets first, ordered by expiration date, then non-expiring
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
    
    -- Update lifetime stats
    UPDATE public.wallets SET lifetime_used = lifetime_used + p_amount WHERE id = v_wallet_id;

    RETURN QUERY SELECT true, (v_total_balance - p_amount);
END;
$$ LANGUAGE plpgsql;
