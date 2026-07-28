-- This migration is intentionally left empty.
-- It was a duplicate of 20260726035635_add_ai_models and caused a "relation already exists" error
-- when attempting to recreate the "Allow public read access to ai_models" policy.
-- Emptying this file fixes the broken migration chain for Vercel deployment.
SELECT 1;
