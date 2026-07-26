-- Drop image_model column safely

DO $$ 
DECLARE
    legacy_count INT;
BEGIN
    -- Check if column exists before querying
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provider_credentials' AND column_name = 'image_model') THEN
        -- Safely count rows using dynamic SQL
        EXECUTE 'SELECT count(*) FROM public.provider_credentials WHERE image_model IS NOT NULL' INTO legacy_count;
        
        IF legacy_count > 0 THEN
            RAISE NOTICE 'Found % rows with image_model in provider_credentials. Proceeding to drop column.', legacy_count;
        END IF;

        ALTER TABLE public.provider_credentials DROP COLUMN image_model;
    END IF;
END $$;
