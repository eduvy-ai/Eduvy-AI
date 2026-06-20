-- Migration 004: Add video_projects and video_frames tables
-- Run with: psql $DATABASE_URL -f 004_add_video_tables.sql

CREATE TABLE IF NOT EXISTS video_projects (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    title               TEXT NOT NULL DEFAULT 'Untitled Video',
    topic               TEXT NOT NULL DEFAULT '',
    engine              TEXT NOT NULL DEFAULT 'sketch',
    style_variant       TEXT NOT NULL DEFAULT 'sketch_classic',
    narration_language  TEXT NOT NULL DEFAULT 'en',
    onscreen_language   TEXT NOT NULL DEFAULT 'en',
    orientation         TEXT NOT NULL DEFAULT 'horizontal',
    pacing              TEXT NOT NULL DEFAULT 'normal',
    timing              TEXT NOT NULL DEFAULT '2',
    status              TEXT NOT NULL DEFAULT 'queued',
    script_json         TEXT DEFAULT '[]',
    file_path           TEXT DEFAULT '',
    thumb_path          TEXT DEFAULT '',
    share_token         TEXT UNIQUE DEFAULT NULL,
    duration_sec        INTEGER DEFAULT 0,
    frame_count         INTEGER DEFAULT 0,
    voice_instructions  TEXT DEFAULT '',
    bg_music            TEXT DEFAULT 'lofi',
    enable_captions     BOOLEAN DEFAULT TRUE,
    error_msg           TEXT DEFAULT '',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at        TIMESTAMP DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS video_frames (
    id          SERIAL PRIMARY KEY,
    video_id    TEXT NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
    frame_index INTEGER NOT NULL,
    narration   TEXT NOT NULL DEFAULT '',
    svg_spec    TEXT NOT NULL DEFAULT '{}',
    frame_path  TEXT DEFAULT '',
    status      TEXT DEFAULT 'pending',
    UNIQUE (video_id, frame_index)
);
