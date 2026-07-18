-- Remove old foreign keys from projects.voice_template_id
DO $$ 
DECLARE
    fk_name text;
BEGIN
    FOR fk_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'projects' 
          AND kcu.column_name = 'voice_template_id'
    LOOP
        EXECUTE 'ALTER TABLE public.projects DROP CONSTRAINT ' || fk_name;
    END LOOP;
END $$;

-- Clean up orphaned values that don't match voice_presets
UPDATE public.projects
SET voice_template_id = NULL
WHERE voice_template_id IS NOT NULL 
AND voice_template_id NOT IN (SELECT id FROM public.voice_presets);

-- Rename the column to match modern architecture
ALTER TABLE public.projects 
RENAME COLUMN voice_template_id TO voice_preset_id;

-- Add new constraint pointing to voice_presets
ALTER TABLE public.projects
ADD CONSTRAINT projects_voice_preset_id_fkey 
FOREIGN KEY (voice_preset_id) REFERENCES public.voice_presets(id) ON DELETE SET NULL;
