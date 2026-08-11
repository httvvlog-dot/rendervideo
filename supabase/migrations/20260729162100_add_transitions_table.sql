CREATE TABLE IF NOT EXISTS public.transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    default_duration NUMERIC NOT NULL DEFAULT 0.5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_builtin BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transitions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transitions' AND policyname = 'Allow public read access to active transitions'
    ) THEN
        CREATE POLICY "Allow public read access to active transitions" ON public.transitions FOR SELECT USING (is_active = true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transitions' AND policyname = 'Admins can manage transitions'
    ) THEN
        CREATE POLICY "Admins can manage transitions" ON public.transitions FOR ALL USING ( public.is_admin() );
    END IF;
END
$$;

-- Seed basic transitions
INSERT INTO public.transitions (code, name, is_builtin) VALUES
('fade', 'Fade', true),
('slide-left', 'Slide Left', true),
('slide-right', 'Slide Right', true),
('push-left', 'Push Left', true),
('push-right', 'Push Right', true),
('zoom-in', 'Zoom In', true),
('zoom-out', 'Zoom Out', true),
('blur', 'Blur', true)
ON CONFLICT (code) DO NOTHING;
