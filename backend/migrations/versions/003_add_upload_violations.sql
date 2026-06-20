-- Migration: Add upload violation tracking to users table
-- Purpose: Track students who repeatedly try to upload inappropriate content

-- Add violation tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS upload_violations INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS upload_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS upload_block_reason TEXT DEFAULT '';

-- Add source summary column to notebook_sources
ALTER TABLE notebook_sources ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';

-- Index for quick lookup of blocked users
CREATE INDEX IF NOT EXISTS idx_users_upload_blocked ON users(upload_blocked) WHERE upload_blocked = TRUE;
