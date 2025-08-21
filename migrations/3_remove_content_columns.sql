-- Remove columns from content table to align with content_distilled structure

-- Drop the columns we no longer need
ALTER TABLE content DROP COLUMN IF EXISTS owner;
ALTER TABLE content DROP COLUMN IF EXISTS repo_name; 
ALTER TABLE content DROP COLUMN IF EXISTS is_processed;
ALTER TABLE content DROP COLUMN IF EXISTS processed_at;

-- Remove the unique constraint that included owner and repo_name
ALTER TABLE content DROP CONSTRAINT IF EXISTS unique_owner_repo_path;

-- Add new unique constraint on just path
ALTER TABLE content ADD CONSTRAINT unique_path UNIQUE (path);
