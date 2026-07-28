-- Migration: update_video_defaults
-- Created: 2026-07-28
-- Changes bg_music default from 'lofi' to 'none' and adds user_id index

-- UP

-- Update default value for bg_music column
ALTER TABLE video_projects ALTER COLUMN bg_music SET DEFAULT 'none';

-- Add index for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_video_projects_user_id ON video_projects(user_id);

-- DOWN
ALTER TABLE video_projects ALTER COLUMN bg_music SET DEFAULT 'lofi';
DROP INDEX IF EXISTS idx_video_projects_user_id;
