-- Add telemetry and versioning to scripts table
ALTER TABLE public.scripts
ADD COLUMN version integer DEFAULT 1,
ADD COLUMN provider text,
ADD COLUMN model text,
ADD COLUMN prompt text,
ADD COLUMN tokens_input integer,
ADD COLUMN tokens_output integer,
ADD COLUMN cost numeric(10, 6),
ADD COLUMN latency_ms integer;
