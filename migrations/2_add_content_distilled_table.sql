CREATE TABLE IF NOT EXISTS content_distilled (
  id SERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_path_distilled UNIQUE (path)
);

CREATE INDEX IF NOT EXISTS idx_content_distilled_path ON content_distilled(path);
CREATE INDEX IF NOT EXISTS idx_content_distilled_filename ON content_distilled(filename);
CREATE INDEX IF NOT EXISTS idx_content_distilled_updated_at ON content_distilled(updated_at);

DROP TRIGGER IF EXISTS update_content_distilled_updated_at ON content_distilled;
CREATE TRIGGER update_content_distilled_updated_at 
  BEFORE UPDATE ON content_distilled
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();