-- Add deleted_at column for soft deletes
ALTER TABLE project_outputs
ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Create an index to make filtering fast
CREATE INDEX idx_project_outputs_deleted_at ON project_outputs(deleted_at);

-- Delete the invalid/fake records as requested by the user
DELETE FROM project_outputs
WHERE output_url = 'test' 
   OR output_url IS NULL 
   OR output_url = '';
