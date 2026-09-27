-- Add index to optimize Image Worker polling (claim_next_image_job)
-- Avoids full table scan by indexing only active jobs (PENDING or PROCESSING)
CREATE INDEX IF NOT EXISTS idx_image_jobs_polling 
ON public.image_jobs (created_at ASC, id ASC)
WHERE status IN ('PENDING', 'PROCESSING');
