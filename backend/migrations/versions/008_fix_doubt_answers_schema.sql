-- Migration: Fix squad_doubt_answers schema
-- Created: 2026-07-31
-- Issue: Original table had column 'answer' but service.py uses 'content'
-- Also adds missing columns: display_name, ai_verdict, ai_note

-- UP

-- Rename 'answer' to 'content' if 'answer' exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'squad_doubt_answers' AND column_name = 'answer'
    ) THEN
        ALTER TABLE squad_doubt_answers RENAME COLUMN answer TO content;
    END IF;
END $$;

-- Add display_name column if missing
ALTER TABLE squad_doubt_answers ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT 'Student';

-- Add ai_verdict column if missing
ALTER TABLE squad_doubt_answers ADD COLUMN IF NOT EXISTS ai_verdict TEXT DEFAULT '';

-- Add ai_note column if missing
ALTER TABLE squad_doubt_answers ADD COLUMN IF NOT EXISTS ai_note TEXT DEFAULT '';

-- DOWN
-- Note: Rollback would lose data, so only uncomment if needed
-- ALTER TABLE squad_doubt_answers RENAME COLUMN content TO answer;
-- ALTER TABLE squad_doubt_answers DROP COLUMN IF EXISTS display_name;
-- ALTER TABLE squad_doubt_answers DROP COLUMN IF EXISTS ai_verdict;
-- ALTER TABLE squad_doubt_answers DROP COLUMN IF EXISTS ai_note;
