-- Migration: Add is_bookmarked column to notebook_studio
-- Date: 2026-07-31

ALTER TABLE notebook_studio ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN DEFAULT FALSE;
