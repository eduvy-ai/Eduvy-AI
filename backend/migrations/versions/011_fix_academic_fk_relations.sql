-- Migration: Fix academic tables with proper foreign key relationships
-- Subjects → references boards, standards
-- Chapters → references boards, standards, subjects

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ UP: Create proper FK relationships                               ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- 1. Drop old chapters table (will be recreated with FKs)
DROP TABLE IF EXISTS chapter_notes CASCADE;
DROP TABLE IF EXISTS chapter_summaries CASCADE;
DROP TABLE IF EXISTS chapter_quiz_results CASCADE;
DROP TABLE IF EXISTS chapter_videos CASCADE;
DROP TABLE IF EXISTS chapter_flashcards CASCADE;
DROP TABLE IF EXISTS chapter_chat_messages CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;

-- 2. Drop old subjects table (will be recreated with FKs)
DROP TABLE IF EXISTS subjects CASCADE;

-- 3. Drop deprecated curriculum table
DROP TABLE IF EXISTS curriculum CASCADE;

-- 4. Ensure base tables exist (boards, standards, mediums)
CREATE TABLE IF NOT EXISTS boards (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS standards (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    grade_num   INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS mediums (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE
);

-- 5. Create subjects with FKs
CREATE TABLE IF NOT EXISTS subjects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    standard_id TEXT NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    UNIQUE (board_id, standard_id, name)
);
CREATE INDEX IF NOT EXISTS idx_subjects_board_std ON subjects(board_id, standard_id);

-- 6. Create chapters with FKs
CREATE TABLE IF NOT EXISTS chapters (
    id              SERIAL PRIMARY KEY,
    board_id        TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    standard_id     TEXT NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
    subject_id      TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_number  INTEGER NOT NULL,
    chapter_name    TEXT NOT NULL,
    chapter_name_local TEXT DEFAULT '',
    description     TEXT DEFAULT '',
    topics          TEXT DEFAULT '[]',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (board_id, standard_id, subject_id, chapter_number)
);
CREATE INDEX IF NOT EXISTS idx_chapters_lookup ON chapters(board_id, standard_id, subject_id);

-- 7. Recreate chapter progress tables with FK to chapters
CREATE TABLE IF NOT EXISTS chapter_notes (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    chapter_id   INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    content      TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chapter_summaries (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    chapter_id  INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    summary     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chapter_quiz_results (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    chapter_id   INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    difficulty   TEXT DEFAULT 'Medium',
    score        INTEGER NOT NULL,
    total        INTEGER NOT NULL,
    answers_json TEXT DEFAULT '[]',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chapter_videos (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    chapter_id  INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    video_id    TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chapter_flashcards (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    chapter_id  INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    cards_json  TEXT NOT NULL DEFAULT '[]',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chapter_chat_messages (
    id           SERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    chapter_id   INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    role         TEXT NOT NULL,
    content      TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Seed some default data if tables are empty
INSERT INTO boards (id, name, sort_order, is_active) VALUES
    ('cbse', 'CBSE', 1, true),
    ('ssc', 'SSC (Maharashtra)', 2, true),
    ('icse', 'ICSE', 3, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO standards (id, name, grade_num, sort_order, is_active) VALUES
    ('class_8', 'Class 8', 8, 1, true),
    ('class_9', 'Class 9', 9, 2, true),
    ('class_10', 'Class 10', 10, 3, true),
    ('class_11', 'Class 11', 11, 4, true),
    ('class_12', 'Class 12', 12, 5, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mediums (id, name, sort_order, is_active) VALUES
    ('english', 'English', 1, true),
    ('hindi', 'Hindi', 2, true),
    ('marathi', 'Marathi', 3, true)
ON CONFLICT (id) DO NOTHING;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ DOWN: Rollback (removes FKs, reverts to old schema)              ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- DOWN:
-- This migration is destructive (drops data).
-- To rollback, manually recreate old schema without FKs.
