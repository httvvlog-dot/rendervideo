-- Drop the insecure UPDATE policy to prevent client-side mutations (AUDIT-003 RLS Privilege Escalation)
DROP POLICY IF EXISTS "Users can update their own image jobs" ON public.image_jobs;

-- From now on, only the Server Actions (via Service Role) and Workers (via Service Role) 
-- can update image_jobs. The authenticated user can only SELECT and INSERT.
