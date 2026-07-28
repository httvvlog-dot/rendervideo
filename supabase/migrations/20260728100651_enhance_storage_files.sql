-- 1. Enhance storage_files table
ALTER TABLE public.storage_files ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE public.storage_files ADD COLUMN IF NOT EXISTS cached_reference_count INTEGER DEFAULT 0;
ALTER TABLE public.storage_files ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.storage_files ADD COLUMN IF NOT EXISTS parent_asset_id UUID REFERENCES public.storage_files(id);
ALTER TABLE public.storage_files ADD COLUMN IF NOT EXISTS generation_type TEXT;
ALTER TABLE public.storage_files ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'CREATED';
ALTER TABLE public.storage_files ADD COLUMN IF NOT EXISTS orphaned_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for lookup
CREATE INDEX IF NOT EXISTS idx_storage_files_content_hash ON public.storage_files(content_hash);
CREATE INDEX IF NOT EXISTS idx_storage_files_status ON public.storage_files(status);

-- 2. Create asset_references table (Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.asset_references (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES public.storage_files(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(asset_id, entity_type, entity_id)
);

-- Index for querying references quickly
CREATE INDEX IF NOT EXISTS idx_asset_references_entity ON public.asset_references(entity_type, entity_id);

-- Enable RLS on asset_references
ALTER TABLE public.asset_references ENABLE ROW LEVEL SECURITY;

-- 3. Add policies for asset_references (Admin only for now, or service role)
-- Service Role can do everything
CREATE POLICY "Enable read for service role" ON public.asset_references FOR SELECT USING (true);
CREATE POLICY "Enable insert for service role" ON public.asset_references FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for service role" ON public.asset_references FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for service role" ON public.asset_references FOR DELETE USING (true);
