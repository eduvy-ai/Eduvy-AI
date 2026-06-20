-- Migration: fix_curriculum_tables
-- Created: 2026-05-28
-- Problem: The original 001_initial_schema.sql created boards/standards/mediums
--          with SERIAL integer PKs and only a 'name' column.
--          The application expects TEXT PKs plus grade_num, sort_order, is_active.
--          CREATE TABLE IF NOT EXISTS in schema.py never runs if the table already
--          exists, so this migration detects and rebuilds the old schema.

-- ── boards ────────────────────────────────────────────────────
DO $$
BEGIN
    -- Old schema: id SERIAL (integer), name TEXT UNIQUE — rebuild it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'boards'
          AND column_name = 'id'
          AND data_type IN ('integer', 'bigint')
    ) THEN
        DROP TABLE IF EXISTS boards CASCADE;
        CREATE TABLE boards (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            sort_order  INTEGER DEFAULT 0,
            is_active   BOOLEAN DEFAULT TRUE
        );
    ELSE
        -- New schema already exists: just add any missing columns
        ALTER TABLE boards ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
        ALTER TABLE boards ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- ── standards ─────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'standards'
          AND column_name = 'id'
          AND data_type IN ('integer', 'bigint')
    ) THEN
        DROP TABLE IF EXISTS standards CASCADE;
        CREATE TABLE standards (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            grade_num   INTEGER NOT NULL DEFAULT 0,
            sort_order  INTEGER DEFAULT 0,
            is_active   BOOLEAN DEFAULT TRUE
        );
    ELSE
        ALTER TABLE standards ADD COLUMN IF NOT EXISTS grade_num  INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE standards ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
        ALTER TABLE standards ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- ── mediums ───────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mediums'
          AND column_name = 'id'
          AND data_type IN ('integer', 'bigint')
    ) THEN
        DROP TABLE IF EXISTS mediums CASCADE;
        CREATE TABLE mediums (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            sort_order  INTEGER DEFAULT 0,
            is_active   BOOLEAN DEFAULT TRUE
        );
    ELSE
        ALTER TABLE mediums ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
        ALTER TABLE mediums ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- ── curriculum — ensure correct schema ────────────────────────
CREATE TABLE IF NOT EXISTS curriculum (
    id          SERIAL PRIMARY KEY,
    board_id    TEXT NOT NULL,
    standard_id TEXT NOT NULL,
    medium_id   TEXT NOT NULL,
    subjects    TEXT DEFAULT '[]',
    is_active   BOOLEAN DEFAULT TRUE,
    UNIQUE (board_id, standard_id, medium_id)
);
