-- Migration: Add file URL columns for R2 storage
-- Adds avatar_url to users, image_url to bhool_cards, file_url to notebook_sources

-- Users: avatar_url for profile pictures
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';

-- Bhool Cards: image_url for attached images
ALTER TABLE bhool_cards ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- Notebook Sources: file_url for original file storage (PDF, images)
ALTER TABLE notebook_sources ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT '';

-- Index for faster lookups on users with avatars
CREATE INDEX IF NOT EXISTS idx_users_avatar ON users(id) WHERE avatar_url != '';
