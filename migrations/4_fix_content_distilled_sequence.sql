-- Fix auto-increment sequence for content_distilled table
-- This addresses the issue where the sequence gets out of sync with actual data

-- Reset the sequence to be higher than the current maximum ID
SELECT setval('content_distilled_id_seq', COALESCE((SELECT MAX(id) FROM content_distilled), 1), true);

-- Add a comment to document this fix
COMMENT ON SEQUENCE content_distilled_id_seq IS 'Auto-increment sequence for content_distilled.id - reset to fix sync issues';
