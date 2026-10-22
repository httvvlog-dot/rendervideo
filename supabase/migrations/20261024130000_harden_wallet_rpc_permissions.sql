-- Migration: Harden Wallet RPC Permissions and Revoke Unsafe Public Access
-- File: supabase/migrations/20261024130000_harden_wallet_rpc_permissions.sql
-- 
-- Description:
-- Production-safe ACL hardening for billing RPCs:
-- 1. Revoke public/anon/authenticated access to legacy/unsecured billing functions.
-- 2. Restrict internal billing RPCs strictly to service_role (invoked via Server Actions and Workers).
-- 3. Prevent direct PostgREST client execution by unauthorized users.

-- 1. Revoke legacy and dormant RPCs
REVOKE ALL ON FUNCTION public.charge_wallet_buckets(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_credits() FROM PUBLIC, anon, authenticated;

-- 2. Restrict Administrative Credit RPCs strictly to service_role
REVOKE ALL ON FUNCTION public.grant_credits(UUID, BIGINT, VARCHAR, TIMESTAMPTZ, TEXT, VARCHAR, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_credits(UUID, BIGINT, VARCHAR, TIMESTAMPTZ, TEXT, VARCHAR, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.admin_adjust_credits(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(UUID, BIGINT, TEXT) TO service_role;

-- 3. Restrict Core Billing RPCs strictly to service_role
REVOKE ALL ON FUNCTION public.reserve_credits(UUID, BIGINT, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT, JSONB, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(UUID, BIGINT, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT, JSONB, INT) TO service_role;

REVOKE ALL ON FUNCTION public.commit_credits(UUID, JSONB, NUMERIC, VARCHAR, VARCHAR, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_credits(UUID, JSONB, NUMERIC, VARCHAR, VARCHAR, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.release_credits(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_credits(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.charge_wallet_buckets(UUID, BIGINT) IS 'DEPRECATED: Unused legacy function. Revoked for security.';
COMMENT ON FUNCTION public.expire_credits() IS 'DEPRECATED: Unused legacy function. Revoked for security.';
