-- Migration: add_accessibility_settings
-- Created: 2026-05-24
-- Adds accessibility settings column to users table

-- UP
ALTER TABLE users ADD COLUMN IF NOT EXISTS accessibility_settings TEXT DEFAULT '{}';

-- DOWN
ALTER TABLE users DROP COLUMN IF EXISTS accessibility_settings;
