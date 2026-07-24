import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.worker' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const sql = `
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
    IF p_bucket_type NOT IN ('PURCHASED', 'WELCOME_BONUS', 'PROMOTION', 'COMPENSATION', 'REFERRAL') THEN
        RAISE EXCEPTION 'Invalid bucket_type: %', p_bucket_type;
    END IF;

    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF v_wallet_id IS NULL THEN RETURN false; END IF;

    INSERT INTO public.wallet_credit_buckets (wallet_id, bucket_type, balance, expires_at)
    VALUES (v_wallet_id, p_bucket_type::public.bucket_type, p_amount, p_expires_at);

    SELECT COALESCE(SUM(balance), 0) INTO v_total_balance 
    FROM public.wallet_credit_buckets 
    WHERE wallet_id = v_wallet_id AND (expires_at IS NULL OR expires_at > NOW());

    INSERT INTO public.wallet_transactions (
        wallet_id, user_id, transaction_type, amount, balance_before, balance_after,
        reference_type, reference_id, description, status
    ) VALUES (
        v_wallet_id, p_user_id, 'ADMIN_GRANT', p_amount, v_total_balance - p_amount, v_total_balance,
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
`;

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  if (error) {
     console.log('We cannot execute SQL this way if exec_sql is not defined.');
  }
}
run();
