-- Initialize complete database structure

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create distillation_jobs table (consolidated with token tracking)
CREATE TABLE IF NOT EXISTS distillation_jobs (
  id SERIAL PRIMARY KEY,
  preset_name VARCHAR(100) NOT NULL,
  batch_id VARCHAR(100),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  model_used VARCHAR(100) NOT NULL,
  total_files INTEGER NOT NULL,
  processed_files INTEGER DEFAULT 0,
  successful_files INTEGER DEFAULT 0,
  minimize_applied BOOLEAN DEFAULT FALSE,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for distillation_jobs
CREATE INDEX IF NOT EXISTS idx_distillation_jobs_preset_name ON distillation_jobs(preset_name);
CREATE INDEX IF NOT EXISTS idx_distillation_jobs_status ON distillation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_distillation_jobs_batch_id ON distillation_jobs(batch_id);

-- Add update trigger for distillation_jobs
DROP TRIGGER IF EXISTS update_distillation_jobs_updated_at ON distillation_jobs;
CREATE TRIGGER update_distillation_jobs_updated_at 
  BEFORE UPDATE ON distillation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create distillations table for versioned distilled content
CREATE TABLE IF NOT EXISTS distillations (
  id SERIAL PRIMARY KEY,
  preset_name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL, -- 'latest' or date like '2024-01-15'
  content TEXT NOT NULL,
  size_kb INTEGER NOT NULL,
  document_count INTEGER DEFAULT 0,
  distillation_job_id INTEGER REFERENCES distillation_jobs(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_distillations_preset_name ON distillations(preset_name);
CREATE INDEX IF NOT EXISTS idx_distillations_version ON distillations(version);
CREATE INDEX IF NOT EXISTS idx_distillations_preset_version ON distillations(preset_name, version);
CREATE INDEX IF NOT EXISTS idx_distillations_job_id ON distillations(distillation_job_id);

-- Add unique constraint for preset + version combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_distillations_unique ON distillations(preset_name, version);

-- Create cache table for repository tarballs
CREATE TABLE IF NOT EXISTS cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL, -- Format: owner/repo
  data BYTEA NOT NULL, -- Binary data for tarball
  size_bytes INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_cache_key ON cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);

-- Create content table
CREATE TABLE IF NOT EXISTS content (
  id SERIAL PRIMARY KEY,
  
  -- Repository information
  owner VARCHAR(100) NOT NULL, -- Repository owner (e.g., 'sveltejs')
  repo_name VARCHAR(100) NOT NULL, -- Repository name (e.g., 'svelte')
  
  -- File information
  path TEXT NOT NULL, -- Full file path (e.g., 'apps/svelte.dev/content/docs/svelte/01-introduction/01-overview.md')
  filename VARCHAR(255) NOT NULL, -- Just the filename (e.g., '01-overview.md')
  
  -- Content
  content TEXT NOT NULL, -- The actual file content
  
  -- Metadata
  size_bytes INTEGER NOT NULL, -- Size of the content in bytes
  is_processed BOOLEAN DEFAULT FALSE, -- Whether this content has been processed
  processed_at TIMESTAMP, -- When the content was processed
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata (frontmatter, etc.)
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint to prevent duplicate files
  CONSTRAINT unique_owner_repo_path UNIQUE (owner, repo_name, path)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_content_owner ON content(owner);
CREATE INDEX IF NOT EXISTS idx_content_repo_name ON content(repo_name);
CREATE INDEX IF NOT EXISTS idx_content_owner_repo ON content(owner, repo_name);
CREATE INDEX IF NOT EXISTS idx_content_path ON content(path);
CREATE INDEX IF NOT EXISTS idx_content_filename ON content(filename);
CREATE INDEX IF NOT EXISTS idx_content_is_processed ON content(is_processed);
CREATE INDEX IF NOT EXISTS idx_content_updated_at ON content(updated_at);

-- Add trigger to update updated_at
DROP TRIGGER IF EXISTS update_content_updated_at ON content;
CREATE TRIGGER update_content_updated_at 
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
