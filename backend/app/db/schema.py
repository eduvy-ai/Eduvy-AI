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
            upload_violations INTEGER DEFAULT 0,
            upload_blocked    BOOLEAN DEFAULT FALSE,
            upload_block_reason TEXT DEFAULT '',
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
            summary     TEXT DEFAULT '',
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
    
    # ── Squad Challenges ──────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_challenges (
            id          SERIAL PRIMARY KEY,
            squad_id    INT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
            subject     TEXT NOT NULL DEFAULT 'General',
            concept     TEXT NOT NULL DEFAULT 'Key Concept',
            status      TEXT NOT NULL DEFAULT 'open',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_challenge_submissions (
            id           SERIAL PRIMARY KEY,
            challenge_id INT NOT NULL REFERENCES squad_challenges(id) ON DELETE CASCADE,
            user_id      TEXT NOT NULL,
            explanation  TEXT NOT NULL,
            xp_awarded   INT DEFAULT 0,
            ai_verdict   TEXT DEFAULT '',
            ai_note      TEXT DEFAULT '',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (challenge_id, user_id)
        )
    """)

    # ── Squad Doubts ──────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_doubts (
            id          SERIAL PRIMARY KEY,
            squad_id    INT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
            user_id     TEXT NOT NULL,
            display_name TEXT NOT NULL DEFAULT 'Student',
            subject     TEXT DEFAULT '',
            question    TEXT NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_doubt_answers (
            id           SERIAL PRIMARY KEY,
            doubt_id     INT NOT NULL REFERENCES squad_doubts(id) ON DELETE CASCADE,
            user_id      TEXT NOT NULL,
            display_name TEXT NOT NULL DEFAULT 'Student',
            content      TEXT NOT NULL,
            upvotes      INT DEFAULT 0,
            ai_verdict   TEXT DEFAULT '',
            ai_note      TEXT DEFAULT '',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_doubt_upvotes (
            answer_id INT NOT NULL,
            user_id   TEXT NOT NULL,
            PRIMARY KEY (answer_id, user_id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_doubt_daily_counts (
            user_id    TEXT NOT NULL,
            day        TEXT NOT NULL,
            count      INT DEFAULT 0,
            PRIMARY KEY (user_id, day)
        )
    """)

    # ── Squad Daily Concept ────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_daily_concepts (
            id          SERIAL PRIMARY KEY,
            squad_id    INT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
            subject     TEXT NOT NULL DEFAULT 'General',
            concept     TEXT NOT NULL,
            day         TEXT NOT NULL,
            UNIQUE (squad_id, day)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_daily_submissions (
            id           SERIAL PRIMARY KEY,
            squad_id     INT NOT NULL,
            day          TEXT NOT NULL,
            user_id      TEXT NOT NULL,
            explanation  TEXT NOT NULL,
            xp_awarded   INT DEFAULT 0,
            ai_verdict   TEXT DEFAULT '',
            ai_note      TEXT DEFAULT '',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (squad_id, day, user_id)
        )
    """)

    # ── Squad Streaks ──────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS squad_streaks (
            squad_id       INT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
            user_id        TEXT NOT NULL,
            current_streak INT DEFAULT 0,
            last_active    TEXT DEFAULT '',
            PRIMARY KEY (squad_id, user_id)
        )
    """)

    # ── Notebook Studio ────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS notebook_studio (
            id          SERIAL PRIMARY KEY,
            user_id     TEXT NOT NULL,
            type        TEXT NOT NULL,
            output_json TEXT NOT NULL DEFAULT '{}',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Bhool Reactions ────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bhool_reactions (
            card_id  TEXT NOT NULL,
            user_id  TEXT NOT NULL,
            emoji    TEXT NOT NULL DEFAULT '👍',
            PRIMARY KEY (card_id, user_id)
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

    cur.execute("""
        CREATE TABLE IF NOT EXISTS curriculum (
            id          SERIAL PRIMARY KEY,
            board_id    TEXT NOT NULL,
            standard_id TEXT NOT NULL,
            medium_id   TEXT NOT NULL,
            subjects    TEXT DEFAULT '[]',
            is_active   BOOLEAN DEFAULT TRUE,
            UNIQUE (board_id, standard_id, medium_id)
        )
    """)

    # ── AI Usage ──────────────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS ai_usage (
            user_id           TEXT NOT NULL,
            date              TEXT NOT NULL,
            call_count        INTEGER DEFAULT 0,
            prompt_tokens     INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, date)
        )
    """)

    # ── App Settings (AI routing + API keys) ─────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            key        TEXT PRIMARY KEY,
            value      TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Drishti Helpers ───────────────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS drishti_helpers (
            id           SERIAL PRIMARY KEY,
            helper_name  TEXT NOT NULL,
            helper_email TEXT UNIQUE NOT NULL,
            helper_type  TEXT NOT NULL DEFAULT 'teacher',
            helper_token TEXT UNIQUE NOT NULL,
            notes        TEXT DEFAULT '',
            is_active    BOOLEAN DEFAULT TRUE,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS drishti_assignments (
            id          SERIAL PRIMARY KEY,
            helper_id   INT NOT NULL REFERENCES drishti_helpers(id) ON DELETE CASCADE,
            student_id  TEXT NOT NULL,
            is_active   BOOLEAN DEFAULT TRUE,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (helper_id, student_id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS helper_notes (
            id         SERIAL PRIMARY KEY,
            helper_id  INT NOT NULL,
            student_id TEXT NOT NULL,
            message    TEXT NOT NULL,
            is_read    BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Video Projects ────────────────────────────────────────
    cur.execute("""
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
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS video_frames (
            id          SERIAL PRIMARY KEY,
            video_id    TEXT NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
            frame_index INTEGER NOT NULL,
            narration   TEXT NOT NULL DEFAULT '',
            svg_spec    TEXT NOT NULL DEFAULT '{}',
            frame_path  TEXT DEFAULT '',
            status      TEXT DEFAULT 'pending',
            UNIQUE (video_id, frame_index)
        )
    """)

    # ── Idempotent column additions ───────────────────────────
    # Add ai_admin_override to users if not present
    cur.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_admin_override BOOLEAN DEFAULT FALSE
    """)

    conn.commit()
    cur.close()
    conn.close()
