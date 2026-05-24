"""
Database schema - all table creation SQL.
Centralized here so init_db() can create everything.
"""
from app.db.connection import get_db


def create_all_tables():
    """Create all tables if they don't exist (idempotent)."""
    conn = get_db()
    cur = conn.cursor()
    
    # ── Users ─────────────────────────────────────────────────
    cur.execute("""
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
        )
    """)
    
    # ── Mastery ───────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS mastery (
            user_id     TEXT NOT NULL,
            subject     TEXT NOT NULL,
            score       INTEGER DEFAULT 50,
            updated_at  TEXT DEFAULT CURRENT_DATE,
            PRIMARY KEY (user_id, subject)
        )
    """)
    
    # ── Quiz Results ──────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS quiz_results (
            id          SERIAL PRIMARY KEY,
            user_id     TEXT NOT NULL,
            subject     TEXT NOT NULL,
            difficulty  TEXT DEFAULT 'Medium',
            correct     INTEGER DEFAULT 0,
            total       INTEGER DEFAULT 1,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Notebook ──────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS notebook_sources (
            id          TEXT NOT NULL,
            user_id     TEXT NOT NULL,
            name        TEXT NOT NULL,
            type        TEXT DEFAULT 'text',
            content     TEXT DEFAULT '',
            icon        TEXT DEFAULT '📄',
            added_at    BIGINT DEFAULT 0,
            PRIMARY KEY (id, user_id)
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS notebook_chats (
            id          SERIAL PRIMARY KEY,
            user_id     TEXT NOT NULL,
            role        TEXT NOT NULL,
            content     TEXT NOT NULL,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Squads ────────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squads (
            id             SERIAL PRIMARY KEY,
            name           TEXT NOT NULL,
            focus_subject  TEXT NOT NULL DEFAULT 'General',
            standard       TEXT NOT NULL DEFAULT 'Class 10',
            medium         TEXT NOT NULL DEFAULT 'English',
            created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active      BOOLEAN DEFAULT TRUE
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_members (
            squad_id     INT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
            user_id      TEXT NOT NULL,
            role         TEXT DEFAULT 'learner',
            joined_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (squad_id, user_id)
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_messages (
            id           SERIAL PRIMARY KEY,
            squad_id     INT NOT NULL,
            user_id      TEXT NOT NULL,
            display_name TEXT NOT NULL DEFAULT 'Student',
            content      TEXT NOT NULL,
            msg_type     TEXT DEFAULT 'chat',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Muqabla Battles ───────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS muqabla_battles (
            id                  SERIAL PRIMARY KEY,
            challenger_id       TEXT NOT NULL,
            challenger_name     TEXT NOT NULL DEFAULT 'Student',
            challenger_school   TEXT NOT NULL DEFAULT '',
            opponent_id         TEXT DEFAULT NULL,
            opponent_name       TEXT DEFAULT '',
            opponent_school     TEXT DEFAULT '',
            subject             TEXT NOT NULL,
            standard            TEXT NOT NULL DEFAULT 'Class 10',
            difficulty          TEXT NOT NULL DEFAULT 'Medium',
            questions_json      TEXT NOT NULL DEFAULT '[]',
            challenger_score    INTEGER DEFAULT NULL,
            challenger_answers  TEXT DEFAULT NULL,
            challenger_time     INTEGER DEFAULT NULL,
            opponent_score      INTEGER DEFAULT NULL,
            opponent_answers    TEXT DEFAULT NULL,
            opponent_time       INTEGER DEFAULT NULL,
            winner_id           TEXT DEFAULT NULL,
            xp_awarded          INTEGER DEFAULT 0,
            status              TEXT NOT NULL DEFAULT 'open',
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at          TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
            completed_at        TIMESTAMP DEFAULT NULL
        )
    """)
    
    # ── Bhool Cards ───────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bhool_cards (
            id              TEXT PRIMARY KEY,
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
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bhool_collections (
            user_id      TEXT NOT NULL,
            card_id      TEXT NOT NULL,
            collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, card_id)
        )
    """)
    
    # ── Parent PIN ────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS parent_pins (
            user_id     TEXT PRIMARY KEY,
            pin         TEXT NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at  TIMESTAMP NOT NULL
        )
    """)
    
    # ── Payments ──────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id              SERIAL PRIMARY KEY,
            user_id         TEXT NOT NULL,
            plan            TEXT NOT NULL,
            amount          INTEGER NOT NULL,
            currency        TEXT DEFAULT 'INR',
            razorpay_order  TEXT,
            razorpay_pay    TEXT,
            status          TEXT DEFAULT 'pending',
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at    TIMESTAMP
        )
    """)
    
    # ── Admin Users ───────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS admin_users (
            id          SERIAL PRIMARY KEY,
            email       TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name        TEXT NOT NULL DEFAULT 'Admin',
            role        TEXT NOT NULL DEFAULT 'superadmin',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Curriculum ────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS boards (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            sort_order  INTEGER DEFAULT 0,
            is_active   BOOLEAN DEFAULT TRUE
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS standards (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            grade_num   INTEGER NOT NULL,
            sort_order  INTEGER DEFAULT 0,
            is_active   BOOLEAN DEFAULT TRUE
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS mediums (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            sort_order  INTEGER DEFAULT 0,
            is_active   BOOLEAN DEFAULT TRUE
        )
    """)
    
    conn.commit()
    cur.close()
    conn.close()
