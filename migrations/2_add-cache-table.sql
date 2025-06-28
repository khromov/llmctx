-- Add cache table for repository tarballs

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