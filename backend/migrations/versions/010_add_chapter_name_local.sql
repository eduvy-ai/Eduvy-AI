-- Add chapter_name_local column for regional language translations
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS chapter_name_local TEXT DEFAULT '';
