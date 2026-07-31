-- 1. Add code column if not exists
ALTER TABLE public.credit_packages ADD COLUMN IF NOT EXISTS code VARCHAR(50);

-- 2. Backfill code for existing rows based on name
UPDATE public.credit_packages SET code = 'starter' WHERE name = 'Starter' AND code IS NULL;
UPDATE public.credit_packages SET code = 'popular' WHERE name = 'Popular' AND code IS NULL;
UPDATE public.credit_packages SET code = 'best_value' WHERE name = 'Best Value' AND code IS NULL;
UPDATE public.credit_packages SET code = 'pkg_' || id::text WHERE code IS NULL;

-- 3. Add UNIQUE constraint if not exists (using a safe block since IF NOT EXISTS on constraints is tricky, but we can do it via plpgsql)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'credit_packages_code_key'
    ) THEN
        ALTER TABLE public.credit_packages ADD CONSTRAINT credit_packages_code_key UNIQUE (code);
    END IF;
END $$;

-- 4. Insert các package mới đúng tỷ lệ và chính sách bonus an toàn
INSERT INTO public.credit_packages (code, name, price_vnd, credits, bonus_credits, is_featured, display_order, is_active)
VALUES
  ('starter', 'Starter', 100000, 100, 0, false, 1, true),
  ('popular', 'Popular', 200000, 200, 10, true, 2, true),
  ('best_value', 'Best Value', 500000, 500, 50, false, 3, true)
ON CONFLICT (code)
DO UPDATE SET
    price_vnd = EXCLUDED.price_vnd,
    credits = EXCLUDED.credits,
    bonus_credits = EXCLUDED.bonus_credits,
    is_active = EXCLUDED.is_active,
    is_featured = EXCLUDED.is_featured,
    display_order = EXCLUDED.display_order;
