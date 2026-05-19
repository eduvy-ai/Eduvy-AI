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

    # ── Sathi Study Squads ────────────────────────────────────
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
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_challenges (
            id               SERIAL PRIMARY KEY,
            squad_id         INT NOT NULL,
            teacher_user_id  TEXT NOT NULL,
            subject          TEXT NOT NULL,
            concept          TEXT NOT NULL,
            status           TEXT DEFAULT 'pending',
            explanation      TEXT DEFAULT '',
            xp_awarded       INT DEFAULT 0,
            created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Muqabla Battles ──────────────────────────────────────
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
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'school'
            ) THEN
                ALTER TABLE users ADD COLUMN school TEXT DEFAULT '';
            END IF;
        END $$;
    """)
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'squads' AND column_name = 'standard'
            ) THEN
                ALTER TABLE squads ADD COLUMN standard TEXT NOT NULL DEFAULT 'Class 10';
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'squads' AND column_name = 'medium'
            ) THEN
                ALTER TABLE squads ADD COLUMN medium TEXT NOT NULL DEFAULT 'English';
            END IF;
        END $$;
    """)

    # ── Parent Dashboard Pins ─────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS parent_pins (
            id          SERIAL PRIMARY KEY,
            user_id     TEXT NOT NULL,
            pin         TEXT NOT NULL UNIQUE,
            label       TEXT NOT NULL DEFAULT 'Parent',
            expires_at  TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days'),
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Bhool Bazaar — Mistake Marketplace ────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bhool_cards (
            id              SERIAL PRIMARY KEY,
            user_id         TEXT NOT NULL,
            subject         TEXT NOT NULL,
            standard        TEXT NOT NULL DEFAULT 'Class 10',
            question        TEXT NOT NULL,
            wrong_answer    TEXT NOT NULL,
            correct_answer  TEXT NOT NULL,
            why_wrong       TEXT NOT NULL DEFAULT '',
            is_published    BOOLEAN DEFAULT FALSE,
            bhool_coins     INTEGER DEFAULT 0,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bhool_collections (
            id          SERIAL PRIMARY KEY,
            user_id     TEXT NOT NULL,
            card_id     INT NOT NULL REFERENCES bhool_cards(id) ON DELETE CASCADE,
            collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, card_id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bhool_reactions (
            id          SERIAL PRIMARY KEY,
            user_id     TEXT NOT NULL,
            card_id     INT NOT NULL REFERENCES bhool_cards(id) ON DELETE CASCADE,
            emoji       TEXT NOT NULL DEFAULT 'same',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, card_id)
        )
    """)

    # ── Sathi — Squad Doubts ──────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_doubts (
            id           SERIAL PRIMARY KEY,
            squad_id     INT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
            user_id      TEXT NOT NULL,
            display_name TEXT NOT NULL DEFAULT 'Student',
            question     TEXT NOT NULL,
            subject      TEXT NOT NULL DEFAULT '',
            status       TEXT NOT NULL DEFAULT 'open',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_doubt_answers (
            id           SERIAL PRIMARY KEY,
            doubt_id     INT NOT NULL REFERENCES squad_doubts(id) ON DELETE CASCADE,
            squad_id     INT NOT NULL,
            user_id      TEXT NOT NULL,
            display_name TEXT NOT NULL DEFAULT 'Student',
            answer       TEXT NOT NULL,
            upvotes      INT NOT NULL DEFAULT 0,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_doubt_upvotes (
            answer_id  INT NOT NULL REFERENCES squad_doubt_answers(id) ON DELETE CASCADE,
            user_id    TEXT NOT NULL,
            PRIMARY KEY (answer_id, user_id)
        )
    """)
    # ── Sathi — AI verdict columns on squad_doubt_answers ─────
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'squad_doubt_answers' AND column_name = 'ai_verdict'
            ) THEN
                ALTER TABLE squad_doubt_answers
                    ADD COLUMN ai_verdict TEXT DEFAULT NULL,
                    ADD COLUMN ai_note    TEXT DEFAULT NULL;
            END IF;
        END$$;
    """)
    # ── Sathi — AI verdict columns on squad_challenges (daily) ─
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'squad_challenges' AND column_name = 'ai_verdict'
            ) THEN
                ALTER TABLE squad_challenges
                    ADD COLUMN ai_verdict TEXT DEFAULT NULL,
                    ADD COLUMN ai_note    TEXT DEFAULT NULL;
            END IF;
        END$$;
    """)
    # ── Sathi — Squad streak columns ──────────────────────────
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'squads' AND column_name = 'streak'
            ) THEN
                ALTER TABLE squads ADD COLUMN streak INT NOT NULL DEFAULT 0;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'squads' AND column_name = 'last_active_date'
            ) THEN
                ALTER TABLE squads ADD COLUMN last_active_date DATE DEFAULT NULL;
            END IF;
        END $$;
    """)

    # ── App Settings (key-value store for global config) ──────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            key        TEXT PRIMARY KEY,
            value      TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Per-user admin AI override flag ───────────────────────
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'ai_admin_override'
            ) THEN
                ALTER TABLE users ADD COLUMN ai_admin_override BOOLEAN DEFAULT FALSE;
            END IF;
        END $$;
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
