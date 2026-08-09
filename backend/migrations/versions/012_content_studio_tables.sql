-- Migration: Content Studio Tables
-- Creates questions, media_files, and assessments tables with FK relationships

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ UP: Create Content Studio tables                                 ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Question Bank
CREATE TABLE IF NOT EXISTS questions (
    id              TEXT PRIMARY KEY,
    chapter_id      INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'fill_blank', 'short_answer', 'long_answer')),
    difficulty      TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question        TEXT NOT NULL,
    options         TEXT DEFAULT '[]',
    correct_answer  TEXT NOT NULL,
    explanation     TEXT DEFAULT '',
    tags            TEXT DEFAULT '[]',
    times_used      INTEGER DEFAULT 0,
    correct_count   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      TEXT DEFAULT '',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active);

-- Media Library
CREATE TABLE IF NOT EXISTS media_files (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'document')),
    url             TEXT NOT NULL,
    thumbnail_url   TEXT DEFAULT '',
    size_bytes      BIGINT DEFAULT 0,
    duration_sec    INTEGER DEFAULT NULL,
    dimensions      TEXT DEFAULT '',
    subject_id      TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    chapter_id      INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    usage_count     INTEGER DEFAULT 0,
    uploaded_by     TEXT DEFAULT '',
    uploaded_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_type ON media_files(type);
CREATE INDEX IF NOT EXISTS idx_media_chapter ON media_files(chapter_id);
CREATE INDEX IF NOT EXISTS idx_media_subject ON media_files(subject_id);

-- Assessments (Quiz Templates)
CREATE TABLE IF NOT EXISTS assessments (
    id              SERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    board_id        TEXT REFERENCES boards(id) ON DELETE CASCADE,
    standard_id     TEXT REFERENCES standards(id) ON DELETE CASCADE,
    subject_id      TEXT REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_id      INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    type            TEXT NOT NULL DEFAULT 'quiz' CHECK (type IN ('quiz', 'mock_test', 'practice', 'assignment')),
    difficulty      TEXT NOT NULL DEFAULT 'mixed' CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
    question_ids    TEXT DEFAULT '[]',
    time_limit_min  INTEGER DEFAULT NULL,
    total_marks     INTEGER DEFAULT 0,
    pass_marks      INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by      TEXT DEFAULT '',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at    TIMESTAMP DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessments_chapter ON assessments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subject ON assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(type);

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ DOWN: Drop tables (destructive)                                  ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- DOWN:
-- DROP TABLE IF EXISTS assessments CASCADE;
-- DROP TABLE IF EXISTS media_files CASCADE;
-- DROP TABLE IF EXISTS questions CASCADE;
