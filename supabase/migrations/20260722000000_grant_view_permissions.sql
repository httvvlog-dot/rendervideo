-- Grant permissions to PostgREST API roles so the client can query the view directly
GRANT SELECT ON public.vw_project_lifecycle_status TO authenticated, anon, service_role;

-- Enforce Row Level Security (RLS) on the view by running it as the invoker
ALTER VIEW public.vw_project_lifecycle_status SET (security_invoker = true);
