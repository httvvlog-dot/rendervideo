CREATE OR REPLACE FUNCTION public.reserve_credits(
    p_user_id uuid, 
    p_amount bigint, 
    p_feature character varying, 
    p_reference_type character varying DEFAULT NULL::character varying, 
    p_reference_id uuid DEFAULT NULL::uuid, 
    p_provider character varying DEFAULT NULL::character varying, 
    p_description text DEFAULT NULL::text, 
    p_metadata jsonb DEFAULT NULL::jsonb, 
    p_timeout_minutes integer DEFAULT 15
) 
RETURNS TABLE(success boolean, transaction_id uuid, available_credits bigint) 
LANGUAGE plpgsql 
AS $$ 
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

    IF p_feature = 'Voice' THEN v_type := 'VOICE_GENERATION'; 
    ELSIF p_feature = 'Image' THEN v_type := 'IMAGE_GENERATION'; 
    ELSIF p_feature = 'Render' THEN v_type := 'VIDEO_RENDER'; 
    ELSIF p_feature = 'Script' THEN v_type := 'SCRIPT_GENERATION'; 
    END IF; 

    INSERT INTO public.wallet_transactions ( 
        wallet_id, user_id, transaction_type, amount, balance_before, balance_after, 
        feature, reference_type, reference_id, provider, description, metadata, status
    ) VALUES ( 
        v_wallet_id, p_user_id, v_type, -p_amount, v_balance_credits, v_balance_credits, 
        p_feature, p_reference_type, p_reference_id, p_provider, p_description, p_metadata, 'PENDING'
    ) RETURNING id INTO v_transaction_id; 

    FOR v_bucket_id, v_bucket_balance IN 
        SELECT b.id, b.balance - COALESCE((SELECT SUM(r.reserved_amount) FROM public.wallet_reservations r WHERE r.bucket_id = b.id AND r.status = 'ACTIVE'), 0) as available_bucket_balance 
        FROM public.wallet_credit_buckets b 
        WHERE b.wallet_id = v_wallet_id AND (b.expires_at IS NULL OR b.expires_at > NOW()) 
        AND b.balance - COALESCE((SELECT SUM(r.reserved_amount) FROM public.wallet_reservations r WHERE r.bucket_id = b.id AND r.status = 'ACTIVE'), 0) > 0 
        ORDER BY CASE WHEN b.expires_at IS NOT NULL THEN 0 ELSE 1 END, b.expires_at ASC 
        FOR UPDATE 
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

    UPDATE public.wallets 
    SET reserved_credits = reserved_credits + p_amount, updated_at = NOW() 
    WHERE id = v_wallet_id; 

    RETURN QUERY SELECT true, v_transaction_id, (v_available_credits - p_amount); 
END; 
$$;
