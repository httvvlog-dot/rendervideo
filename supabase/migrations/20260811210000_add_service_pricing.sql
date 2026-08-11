CREATE TABLE IF NOT EXISTS public.service_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_key VARCHAR(50) UNIQUE NOT NULL,
    cost_vnd NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (cost_vnd >= 0),
    profit_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (profit_percent >= 0),
    selling_price_vnd NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (selling_price_vnd >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to service_pricing" ON public.service_pricing FOR SELECT USING (true);
CREATE POLICY "Allow admin all access to service_pricing" ON public.service_pricing FOR ALL USING (public.is_admin());

INSERT INTO public.service_pricing (service_key, cost_vnd, profit_percent, selling_price_vnd)
VALUES
('SCRIPT', 1000, 50, 1500),
('IMAGE', 1700, 50, 2550),
('VOICE', 2000, 50, 3000),
('VIDEO', 5000, 50, 7500)
ON CONFLICT (service_key) DO UPDATE SET
    cost_vnd = EXCLUDED.cost_vnd,
    profit_percent = EXCLUDED.profit_percent,
    selling_price_vnd = EXCLUDED.selling_price_vnd;

