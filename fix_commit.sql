CREATE OR REPLACE FUNCTION public.commit_credits(
    p_transaction_id uuid, 
    p_provider_metadata jsonb DEFAULT NULL::jsonb, 
    p_actual_usd_cost numeric DEFAULT NULL::numeric, 
    p_model character varying DEFAULT NULL::character varying, 
    p_pricing_version character varying DEFAULT NULL::character varying, 
    p_project_id uuid DEFAULT NULL::uuid
) RETURNS boolean LANGUAGE plpgsql AS $$ 
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
    SELECT wallet_id, user_id, amount, status, provider, feature 
    INTO v_wallet_id, v_user_id, v_amount, v_status, v_provider, v_feature 
    FROM public.wallet_transactions 
    WHERE id = p_transaction_id 
    FOR UPDATE; 

    IF v_status != 'PENDING' THEN RETURN false; END IF; 

    PERFORM id FROM public.wallets WHERE id = v_wallet_id FOR UPDATE; 

    FOR v_bucket_id, v_res_amount IN 
        SELECT bucket_id, reserved_amount 
        FROM public.wallet_reservations 
        WHERE wallet_transaction_id = p_transaction_id AND status = 'ACTIVE' 
        FOR UPDATE 
    LOOP 
        UPDATE public.wallet_credit_buckets SET balance = balance - v_res_amount WHERE id = v_bucket_id; 
        UPDATE public.wallet_reservations SET status = 'COMMITTED' WHERE wallet_transaction_id = p_transaction_id AND bucket_id = v_bucket_id; 
    END LOOP; 

    SELECT COALESCE(SUM(balance), 0) INTO v_total_balance 
    FROM public.wallet_credit_buckets 
    WHERE wallet_id = v_wallet_id AND (expires_at IS NULL OR expires_at > NOW()); 

    UPDATE public.wallets 
    SET balance_credits = v_total_balance, 
        reserved_credits = GREATEST(0, reserved_credits - ABS(v_amount)), 
        lifetime_used = lifetime_used + ABS(v_amount), 
        total_consumed_credits = total_consumed_credits + ABS(v_amount), 
        updated_at = NOW() 
    WHERE id = v_wallet_id; 

    UPDATE public.wallet_transactions 
    SET status = 'COMPLETED', balance_after = v_total_balance 
    WHERE id = p_transaction_id; 

    IF p_actual_usd_cost IS NOT NULL THEN 
        INSERT INTO public.provider_cost_logs ( 
            user_id, project_id, provider, model, request_type, usd_cost, usage_metadata, pricing_version, wallet_transaction_id 
        ) VALUES ( 
            v_user_id, p_project_id, v_provider, COALESCE(p_model, 'unknown'), v_feature, p_actual_usd_cost, p_provider_metadata, p_pricing_version, p_transaction_id 
        ); 
    END IF; 
    RETURN true; 
END; 
$$;
