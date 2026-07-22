BEGIN;

-- RELATIONAL RBAC
CREATE TABLE IF NOT EXISTS public.auth_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.auth_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.auth_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.auth_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.auth_role_permissions (
    role_id UUID REFERENCES public.auth_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.auth_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
ALTER TABLE public.auth_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.auth_user_roles (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.auth_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
ALTER TABLE public.auth_user_roles ENABLE ROW LEVEL SECURITY;

-- Seed default roles
INSERT INTO public.auth_roles (name, description) VALUES
('super_admin', 'Full system access'),
('admin', 'General admin access'),
('support', 'Customer support access'),
('moderator', 'Content moderation access'),
('user', 'Standard user')
ON CONFLICT (name) DO NOTHING;

-- Seed default permissions
INSERT INTO public.auth_permissions (code, description) VALUES
('billing.view', 'View billing information'),
('billing.manage', 'Manage billing and pricing'),
('wallet.view', 'View user wallets'),
('wallet.adjust', 'Adjust or grant credits'),
('users.view', 'View user profiles'),
('users.edit', 'Edit user profiles and status'),
('projects.retry', 'Retry failed rendering jobs'),
('projects.delete', 'Delete user projects'),
('providers.manage', 'Manage AI providers and API keys')
ON CONFLICT (code) DO NOTHING;

-- Drop JSONB permissions if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS permissions;

COMMIT;
