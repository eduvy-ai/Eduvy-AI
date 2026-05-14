import json
import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db() -> psycopg2.extensions.connection:
    """Open and return a new PostgreSQL connection.
    Rows are returned as RealDictRow (dict-like) by default.
    """
    conn = psycopg2.connect(
        DATABASE_URL,
        cursor_factory=psycopg2.extras.RealDictCursor,
    )
    return conn


def init_db():
    """Create all tables if they don't exist yet (idempotent)."""
    conn = get_db()
    cur = conn.cursor()
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
            created_at      TEXT DEFAULT CURRENT_DATE
        )
    """)
    # --- Add ai_keys column if missing (existing DBs) ---
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'ai_keys'
            ) THEN
                ALTER TABLE users ADD COLUMN ai_keys TEXT DEFAULT '{}';
            END IF;
        END $$;
    """)
    # --- Add plan columns if missing (existing DBs) ---
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'plan'
            ) THEN
                ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'plan_expires_at'
            ) THEN
                ALTER TABLE users ADD COLUMN plan_expires_at TEXT DEFAULT '';
            END IF;
        END $$;
    """)
    # --- Add email/password_hash columns if missing (existing DBs) ---
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'email'
            ) THEN
                ALTER TABLE users ADD COLUMN email TEXT UNIQUE DEFAULT '';
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'password_hash'
            ) THEN
                ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT '';
            END IF;
        END $$;
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS mastery (
            user_id     TEXT NOT NULL,
            subject     TEXT NOT NULL,
            score       INTEGER DEFAULT 50,
            updated_at  TEXT DEFAULT CURRENT_DATE,
            PRIMARY KEY (user_id, subject)
        )
    """)
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
    cur.execute("""
        CREATE TABLE IF NOT EXISTS studio_outputs (
            id          SERIAL PRIMARY KEY,
            user_id     TEXT NOT NULL,
            type        TEXT NOT NULL,
            output_json TEXT NOT NULL,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id          SERIAL PRIMARY KEY,
            user_id     TEXT NOT NULL,
            session     TEXT NOT NULL,
            role        TEXT NOT NULL,
            content     TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_drafts (
            user_id     TEXT NOT NULL,
            draft_key   TEXT NOT NULL,
            content     TEXT NOT NULL DEFAULT '',
            extra       TEXT NOT NULL DEFAULT '',
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, draft_key)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS ai_usage (
            id                  SERIAL PRIMARY KEY,
            user_id             TEXT NOT NULL,
            date                TEXT NOT NULL,
            call_count          INTEGER DEFAULT 0,
            prompt_tokens       INTEGER DEFAULT 0,
            completion_tokens   INTEGER DEFAULT 0,
            UNIQUE (user_id, date)
        )
    """)
    # ── Curriculum / Admin tables ─────────────────────────────────
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
    cur.execute("""
        CREATE TABLE IF NOT EXISTS curriculum (
            id          SERIAL PRIMARY KEY,
            board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
            standard_id TEXT NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
            medium_id   TEXT NOT NULL REFERENCES mediums(id) ON DELETE CASCADE,
            subjects    TEXT NOT NULL DEFAULT '[]',
            is_active   BOOLEAN DEFAULT TRUE,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (board_id, standard_id, medium_id)
        )
    """)
    conn.commit()
    cur.close()
    conn.close()


def row_to_dict(row) -> dict | None:
    """Convert a RealDictRow to a plain dict and deserialize subjects JSON."""
    if row is None:
        return None
    d = dict(row)
    try:
        d["subjects"] = json.loads(d.get("subjects") or "[]")
    except Exception:
        d["subjects"] = []
    try:
        d["ai_keys"] = json.loads(d.get("ai_keys") or "{}")
    except Exception:
        d["ai_keys"] = {}
    return d
