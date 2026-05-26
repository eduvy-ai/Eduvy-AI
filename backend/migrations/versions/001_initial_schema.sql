-- Migration: initial_schema
-- Created: 2026-05-24
-- This captures the existing schema - already applied to production

-- UP

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    email           TEXT UNIQUE DEFAULT '',
    password_hash   TEXT DEFAULT '',
    name            TEXT NOT NULL,
    mobile          TEXT DEFAULT '',
    parent_mobile   TEXT DEFAULT '',
    standard        TEXT DEFAULT 'Class 10',
    board           TEXT DEFAULT 'CBSE',
    language        TEXT DEFAULT 'English',
    display_language TEXT DEFAULT 'medium',
    subjects        TEXT DEFAULT '[]',
    xp              INTEGER DEFAULT 0,
    streak          INTEGER DEFAULT 1,
    last_active     TEXT DEFAULT '',
    ai_provider     TEXT DEFAULT 'gemini',
    ai_model        TEXT DEFAULT 'gemini-2.0-flash',
    ai_key          TEXT DEFAULT '',
    ai_keys         TEXT DEFAULT '{}',
    plan            TEXT DEFAULT 'free',
    plan_expires_at TEXT DEFAULT '',
    school          TEXT DEFAULT '',
    referral_code   TEXT DEFAULT '',
    referred_by     TEXT DEFAULT '',
    is_admin        BOOLEAN DEFAULT FALSE,
    is_drishti      BOOLEAN DEFAULT FALSE,
    created_at      TEXT DEFAULT CURRENT_DATE
);

-- Mastery table
CREATE TABLE IF NOT EXISTS mastery (
    user_id     TEXT NOT NULL,
    subject     TEXT NOT NULL,
    score       INTEGER DEFAULT 50,
    updated_at  TEXT DEFAULT CURRENT_DATE,
    PRIMARY KEY (user_id, subject)
);

-- Quiz results
CREATE TABLE IF NOT EXISTS quiz_results (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    subject     TEXT NOT NULL,
    difficulty  TEXT DEFAULT 'Medium',
    correct     INTEGER DEFAULT 0,
    total       INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Notebook sources
CREATE TABLE IF NOT EXISTS notebook_sources (
    id          TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    type        TEXT DEFAULT 'text',
    content     TEXT DEFAULT '',
    icon        TEXT DEFAULT '📄',
    added_at    BIGINT DEFAULT 0,
    PRIMARY KEY (id, user_id)
);

-- Notebook chats
CREATE TABLE IF NOT EXISTS notebook_chats (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Studio outputs
CREATE TABLE IF NOT EXISTS studio_outputs (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    type        TEXT NOT NULL,
    content     TEXT DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    session     TEXT NOT NULL,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User drafts
CREATE TABLE IF NOT EXISTS user_drafts (
    user_id     TEXT NOT NULL,
    key         TEXT NOT NULL,
    content     TEXT DEFAULT '',
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, key)
);

-- Curriculum data
CREATE TABLE IF NOT EXISTS boards (
    id      SERIAL PRIMARY KEY,
    name    TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS standards (
    id      SERIAL PRIMARY KEY,
    name    TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS mediums (
    id      SERIAL PRIMARY KEY,
    name    TEXT UNIQUE NOT NULL
);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL,
    tokens      INTEGER DEFAULT 0,
    provider    TEXT DEFAULT 'gemini',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bhool cards
CREATE TABLE IF NOT EXISTS bhool_cards (
    id              SERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL,
    subject         TEXT NOT NULL DEFAULT 'General',
    standard        TEXT DEFAULT 'Class 10',
    question        TEXT NOT NULL,
    wrong_answer    TEXT NOT NULL,
    correct_answer  TEXT NOT NULL,
    why_wrong       TEXT DEFAULT '',
    is_published    BOOLEAN DEFAULT TRUE,
    bhool_coins     INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bhool collections
CREATE TABLE IF NOT EXISTS bhool_collections (
    user_id      TEXT NOT NULL,
    card_id      INTEGER NOT NULL,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, card_id)
);

-- Bhool reactions
CREATE TABLE IF NOT EXISTS bhool_reactions (
    user_id     TEXT NOT NULL,
    card_id     INTEGER NOT NULL,
    emoji       TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, card_id)
);

-- Parent PINs
CREATE TABLE IF NOT EXISTS parent_pins (
    user_id     TEXT PRIMARY KEY,
    pin         TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at  TIMESTAMP NOT NULL
);

-- Squads
CREATE TABLE IF NOT EXISTS squads (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    focus_subject   TEXT DEFAULT 'General',
    standard        TEXT DEFAULT 'Class 10',
    medium          TEXT DEFAULT 'English',
    is_active       BOOLEAN DEFAULT TRUE,
    streak          INTEGER DEFAULT 0,
    last_active_date DATE DEFAULT CURRENT_DATE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Squad members
CREATE TABLE IF NOT EXISTS squad_members (
    squad_id        INTEGER NOT NULL,
    user_id         TEXT NOT NULL,
    role            TEXT DEFAULT 'learner',
    joined_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (squad_id, user_id)
);

-- Squad messages
CREATE TABLE IF NOT EXISTS squad_messages (
    id              SERIAL PRIMARY KEY,
    squad_id        INTEGER NOT NULL,
    user_id         TEXT NOT NULL,
    display_name    TEXT DEFAULT 'Student',
    content         TEXT NOT NULL,
    msg_type        TEXT DEFAULT 'text',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Squad challenges
CREATE TABLE IF NOT EXISTS squad_challenges (
    id              SERIAL PRIMARY KEY,
    squad_id        INTEGER NOT NULL,
    creator_id      TEXT NOT NULL,
    subject         TEXT NOT NULL,
    question        TEXT NOT NULL,
    answer          TEXT DEFAULT '',
    status          TEXT DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Squad doubts
CREATE TABLE IF NOT EXISTS squad_doubts (
    id              SERIAL PRIMARY KEY,
    squad_id        INTEGER NOT NULL,
    user_id         TEXT NOT NULL,
    subject         TEXT NOT NULL,
    question        TEXT NOT NULL,
    is_resolved     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Squad doubt answers
CREATE TABLE IF NOT EXISTS squad_doubt_answers (
    id              SERIAL PRIMARY KEY,
    doubt_id        INTEGER NOT NULL,
    user_id         TEXT NOT NULL,
    answer          TEXT NOT NULL,
    is_accepted     BOOLEAN DEFAULT FALSE,
    upvotes         INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Squad doubt upvotes
CREATE TABLE IF NOT EXISTS squad_doubt_upvotes (
    answer_id       INTEGER NOT NULL,
    user_id         TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (answer_id, user_id)
);

-- Muqabla battles
CREATE TABLE IF NOT EXISTS muqabla_battles (
    id              SERIAL PRIMARY KEY,
    challenger_id   TEXT NOT NULL,
    opponent_id     TEXT,
    subject         TEXT NOT NULL,
    status          TEXT DEFAULT 'waiting',
    winner_id       TEXT,
    challenger_score INTEGER DEFAULT 0,
    opponent_score  INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id              SERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL,
    plan            TEXT NOT NULL,
    amount          INTEGER NOT NULL,
    currency        TEXT DEFAULT 'INR',
    status          TEXT DEFAULT 'pending',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment history
CREATE TABLE IF NOT EXISTS payment_history (
    id              SERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL,
    plan            TEXT NOT NULL,
    amount          INTEGER NOT NULL,
    status          TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
    id              SERIAL PRIMARY KEY,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL,
    role            TEXT DEFAULT 'admin',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drishti helpers
CREATE TABLE IF NOT EXISTS drishti_helpers (
    id              SERIAL PRIMARY KEY,
    user_id         TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    email           TEXT DEFAULT '',
    specialization  TEXT DEFAULT 'General',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helper-student mapping
CREATE TABLE IF NOT EXISTS helper_student_map (
    helper_id       TEXT NOT NULL,
    student_id      TEXT NOT NULL,
    assigned_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (helper_id, student_id)
);

-- Helper notes
CREATE TABLE IF NOT EXISTS helper_notes (
    id              SERIAL PRIMARY KEY,
    helper_id       TEXT NOT NULL,
    student_id      TEXT NOT NULL,
    note            TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- App settings
CREATE TABLE IF NOT EXISTS app_settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- DOWN
-- WARNING: This will drop ALL tables!
-- DROP TABLE IF EXISTS app_settings CASCADE;
-- DROP TABLE IF EXISTS helper_notes CASCADE;
-- DROP TABLE IF EXISTS helper_student_map CASCADE;
-- DROP TABLE IF EXISTS drishti_helpers CASCADE;
-- DROP TABLE IF EXISTS admin_users CASCADE;
-- DROP TABLE IF EXISTS payment_history CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS muqabla_battles CASCADE;
-- DROP TABLE IF EXISTS squad_doubt_upvotes CASCADE;
-- DROP TABLE IF EXISTS squad_doubt_answers CASCADE;
-- DROP TABLE IF EXISTS squad_doubts CASCADE;
-- DROP TABLE IF EXISTS squad_challenges CASCADE;
-- DROP TABLE IF EXISTS squad_messages CASCADE;
-- DROP TABLE IF EXISTS squad_members CASCADE;
-- DROP TABLE IF EXISTS squads CASCADE;
-- DROP TABLE IF EXISTS parent_pins CASCADE;
-- DROP TABLE IF EXISTS bhool_reactions CASCADE;
-- DROP TABLE IF EXISTS bhool_collections CASCADE;
-- DROP TABLE IF EXISTS bhool_cards CASCADE;
-- DROP TABLE IF EXISTS ai_usage CASCADE;
-- DROP TABLE IF EXISTS mediums CASCADE;
-- DROP TABLE IF EXISTS standards CASCADE;
-- DROP TABLE IF EXISTS boards CASCADE;
-- DROP TABLE IF EXISTS user_drafts CASCADE;
-- DROP TABLE IF EXISTS chat_sessions CASCADE;
-- DROP TABLE IF EXISTS studio_outputs CASCADE;
-- DROP TABLE IF EXISTS notebook_chats CASCADE;
-- DROP TABLE IF EXISTS notebook_sources CASCADE;
-- DROP TABLE IF EXISTS quiz_results CASCADE;
-- DROP TABLE IF EXISTS mastery CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
