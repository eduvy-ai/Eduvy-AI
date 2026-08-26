"""
Database schema - all table creation SQL.
Centralized here so init_db() can create everything.
"""
import secrets
import string
from app.db.connection import get_db


def _generate_school_code() -> str:
    """Generate 8-char alphanumeric school join code."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))


def create_all_tables():
    """Create all tables if they don't exist (idempotent)."""
    conn = get_db()
    cur = conn.cursor()

    # ── Schools (must be created before users for FK) ─────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS schools (
            id              SERIAL PRIMARY KEY,
            name            TEXT NOT NULL,
            logo_url        TEXT DEFAULT '',
            contact_email   TEXT DEFAULT '',
            contact_phone   TEXT DEFAULT '',
            address         TEXT DEFAULT '',
            city            TEXT DEFAULT '',
            state           TEXT DEFAULT '',
            plan            TEXT DEFAULT 'pilot',
            student_limit   INTEGER DEFAULT 100,
            plan_expires_at TEXT DEFAULT '',
            school_code     TEXT UNIQUE NOT NULL,
            admin_user_id   TEXT DEFAULT '',
            is_active       BOOLEAN DEFAULT TRUE,
            curriculum_imported BOOLEAN DEFAULT FALSE,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(school_code)")
    cur.execute("""
        DO $$ BEGIN
            ALTER TABLE schools ADD COLUMN IF NOT EXISTS curriculum_imported BOOLEAN DEFAULT FALSE;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$
    """)

    # ── Public Account Requests ───────────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS account_requests (
            id                SERIAL PRIMARY KEY,
            request_type      TEXT NOT NULL,
            status            TEXT NOT NULL DEFAULT 'pending',
            full_name         TEXT NOT NULL,
            email             TEXT NOT NULL,
            phone             TEXT DEFAULT '',
            school_name       TEXT DEFAULT '',
            standard          TEXT DEFAULT '',
            board             TEXT DEFAULT '',
            stream            TEXT DEFAULT '',
            language          TEXT DEFAULT '',
            city              TEXT DEFAULT '',
            state             TEXT DEFAULT '',
            message           TEXT DEFAULT '',
            review_notes      TEXT DEFAULT '',
            resolution_payload TEXT DEFAULT '',
            reviewed_by       INTEGER DEFAULT NULL,
            reviewed_at       TIMESTAMP DEFAULT NULL,
            created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_account_requests_status ON account_requests(status)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_account_requests_type ON account_requests(request_type)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_account_requests_created_at ON account_requests(created_at DESC)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_account_requests_email ON account_requests(LOWER(email))")
    
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
            school_id       INTEGER DEFAULT NULL,
            referral_code   TEXT DEFAULT '',
            referred_by     TEXT DEFAULT '',
            is_admin        BOOLEAN DEFAULT FALSE,
            is_drishti      BOOLEAN DEFAULT FALSE,
            upload_violations INTEGER DEFAULT 0,
            upload_blocked    BOOLEAN DEFAULT FALSE,
            upload_block_reason TEXT DEFAULT '',
            avatar_url      TEXT DEFAULT '',
            must_change_password BOOLEAN DEFAULT FALSE,
            temp_password   TEXT DEFAULT '',
            created_at      TEXT DEFAULT CURRENT_DATE
        )
    """)
    # Add school_id column if missing (migration for existing DBs)
    cur.execute("""
        DO $$ BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT NULL;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$
    """)
    # Add stream column if missing (for Class 11-12)
    cur.execute("""
        DO $$ BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS stream TEXT DEFAULT '';
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$
    """)
    # Add must_change_password column if missing (for OTP flow)
    cur.execute("""
        DO $$ BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_password TEXT DEFAULT '';
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$
    """)
    # Add is_suspended column if missing (for admin suspension)
    cur.execute("""
        DO $$ BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$
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
            file_url    TEXT DEFAULT '',
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
            image_url       TEXT DEFAULT '',
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

    # ── Payment Logs (idempotent payment verification) ────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS payment_logs (
            id                   SERIAL PRIMARY KEY,
            user_id              TEXT NOT NULL,
            razorpay_order_id    TEXT NOT NULL,
            razorpay_payment_id  TEXT UNIQUE NOT NULL,
            plan                 TEXT NOT NULL,
            amount               INTEGER NOT NULL,
            status               TEXT DEFAULT 'success',
            created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_payment_logs_user ON payment_logs(user_id)")
    
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
            id            SERIAL PRIMARY KEY,
            user_id       TEXT NOT NULL,
            type          TEXT NOT NULL,
            output_json   TEXT NOT NULL DEFAULT '{}',
            is_bookmarked BOOLEAN DEFAULT FALSE,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Performance indexes for notebook and squad queries ──
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notebook_sources_user ON notebook_sources(user_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notebook_chats_user ON notebook_chats(user_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_squad_messages_squad ON squad_messages(squad_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_squad_doubts_squad ON squad_doubts(squad_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_squad_doubt_answers_doubt ON squad_doubt_answers(doubt_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_notebook_studio_user ON notebook_studio(user_id)")

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
            school_id   INTEGER REFERENCES schools(id) ON DELETE SET NULL,
            must_change_password BOOLEAN DEFAULT FALSE,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Migration: add new columns if missing
    cur.execute("""
        DO $$ BEGIN
            ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL;
            ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
        EXCEPTION WHEN others THEN NULL;
        END $$;
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

    # ── Streams (Science, Commerce, Arts for Class 11-12) ─────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS streams (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            sort_order  INTEGER DEFAULT 0,
            is_active   BOOLEAN DEFAULT TRUE
        )
    """)

    # ── Subjects (per board+standard+stream) ──────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS subjects (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
            standard_id TEXT NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
            stream_id   TEXT DEFAULT NULL REFERENCES streams(id) ON DELETE SET NULL,
            sort_order  INTEGER DEFAULT 0,
            is_active   BOOLEAN DEFAULT TRUE,
            UNIQUE (board_id, standard_id, stream_id, name)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_subjects_board_std ON subjects(board_id, standard_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_subjects_stream ON subjects(stream_id)")
    # Migration: add stream_id if table already exists
    cur.execute("""DO $$ BEGIN
        ALTER TABLE subjects ADD COLUMN stream_id TEXT DEFAULT NULL REFERENCES streams(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$""")

    # ── Curriculum (deprecated - kept for migration) ──────────
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

    # ── Chapters (Chapter-Centric Learning) ───────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapters (
            id              SERIAL PRIMARY KEY,
            board_id        TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
            standard_id     TEXT NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
            subject_id      TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            stream_id       TEXT DEFAULT NULL REFERENCES streams(id) ON DELETE SET NULL,
            chapter_number  INTEGER NOT NULL,
            chapter_name    TEXT NOT NULL,
            chapter_name_local TEXT DEFAULT '',
            description     TEXT DEFAULT '',
            topics          TEXT DEFAULT '[]',
            content_status  TEXT DEFAULT 'draft' CHECK (content_status IN ('draft', 'review', 'published')),
            is_active       BOOLEAN DEFAULT TRUE,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (board_id, standard_id, subject_id, chapter_number)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapters_lookup ON chapters(board_id, standard_id, subject_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapters_stream ON chapters(stream_id)")
    # Migration: add columns if table already exists
    cur.execute("""DO $$ BEGIN
        ALTER TABLE chapters ADD COLUMN chapter_name_local TEXT DEFAULT '';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$""")
    cur.execute("""DO $$ BEGIN
        ALTER TABLE chapters ADD COLUMN stream_id TEXT DEFAULT NULL REFERENCES streams(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$""")
    cur.execute("""DO $$ BEGIN
        ALTER TABLE chapters ADD COLUMN content_status TEXT DEFAULT 'draft' CHECK (content_status IN ('draft', 'review', 'published'));
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$""")

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

    # ── AI Prompts (dynamic prompt management) ─────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS ai_prompts (
            id           SERIAL PRIMARY KEY,
            key          TEXT UNIQUE NOT NULL,
            name         TEXT NOT NULL,
            description  TEXT DEFAULT '',
            category     TEXT NOT NULL DEFAULT 'system',
            template     TEXT NOT NULL,
            variables    TEXT DEFAULT '[]',
            model        TEXT DEFAULT 'gpt-4o-mini',
            max_tokens   INTEGER DEFAULT 1024,
            temperature  REAL DEFAULT 0.7,
            is_active    BOOLEAN DEFAULT TRUE,
            version      INTEGER DEFAULT 1,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by   TEXT
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_ai_prompts_key ON ai_prompts(key)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category)")

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



    # ── Chapter Progress (Notes, Summaries, Quiz, Videos, Flashcards, AI Chat) ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapter_notes (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            chapter_id   INTEGER NOT NULL,
            content      TEXT NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapter_notes_user_chapter ON chapter_notes(user_id, chapter_id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapter_summaries (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            chapter_id   INTEGER NOT NULL,
            summary      TEXT NOT NULL,
            key_points   TEXT DEFAULT '[]',
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, chapter_id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapter_uploads (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            chapter_id   INTEGER NOT NULL,
            name         TEXT NOT NULL,
            url          TEXT NOT NULL,
            file_type    TEXT NOT NULL DEFAULT 'text',
            file_size    INTEGER DEFAULT 0,
            uploaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapter_uploads_user_chapter ON chapter_uploads(user_id, chapter_id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapter_quiz_history (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            chapter_id   INTEGER NOT NULL,
            mode         TEXT NOT NULL DEFAULT 'quick',
            score        INTEGER NOT NULL DEFAULT 0,
            total        INTEGER NOT NULL DEFAULT 0,
            time_spent   INTEGER DEFAULT 0,
            questions    TEXT DEFAULT '[]',
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapter_quiz_history_user_chapter ON chapter_quiz_history(user_id, chapter_id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapter_quiz_bookmarks (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            chapter_id   INTEGER NOT NULL,
            question     TEXT NOT NULL,
            options      TEXT DEFAULT '[]',
            correct_idx  INTEGER DEFAULT 0,
            explanation  TEXT DEFAULT '',
            bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapter_quiz_bookmarks_user_chapter ON chapter_quiz_bookmarks(user_id, chapter_id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapter_video_history (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            chapter_id   INTEGER NOT NULL,
            video_id     TEXT NOT NULL,
            title        TEXT NOT NULL,
            search_query TEXT DEFAULT '',
            watched_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapter_video_history_user_chapter ON chapter_video_history(user_id, chapter_id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapter_video_bookmarks (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            chapter_id   INTEGER NOT NULL,
            video_id     TEXT NOT NULL,
            title        TEXT NOT NULL,
            description  TEXT DEFAULT '',
            concept      TEXT DEFAULT '',
            search_query TEXT DEFAULT '',
            bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, video_id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapter_flashcard_sets (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            chapter_id   INTEGER NOT NULL,
            name         TEXT NOT NULL DEFAULT 'Flashcard Set',
            cards        TEXT NOT NULL DEFAULT '[]',
            mastery      TEXT DEFAULT '{}',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapter_flashcard_sets_user_chapter ON chapter_flashcard_sets(user_id, chapter_id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapter_ai_chats (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            chapter_id   INTEGER NOT NULL,
            session_id   TEXT NOT NULL,
            role         TEXT NOT NULL,
            content      TEXT NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapter_ai_chats_user_session ON chapter_ai_chats(user_id, session_id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chapter_ai_sessions (
            id           TEXT PRIMARY KEY,
            user_id      TEXT NOT NULL,
            chapter_id   INTEGER NOT NULL,
            title        TEXT NOT NULL DEFAULT 'New Chat',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapter_ai_sessions_user_chapter ON chapter_ai_sessions(user_id, chapter_id)")

    # ── Daily Content (Home page brief & daily question) ─────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS daily_content (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            content_type TEXT NOT NULL,
            content      TEXT NOT NULL,
            language     TEXT NOT NULL DEFAULT 'English',
            date         TEXT NOT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, content_type, language, date)
        )
    """)

    # ── Coach Sessions (Study Coach history) ──────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS coach_sessions (
            id           SERIAL PRIMARY KEY,
            user_id      TEXT NOT NULL,
            question     TEXT NOT NULL,
            title        TEXT NOT NULL DEFAULT '',
            subject      TEXT NOT NULL DEFAULT 'General',
            mode         TEXT NOT NULL DEFAULT 'study_coach',
            response_json TEXT NOT NULL DEFAULT '{}',
            is_bookmarked BOOLEAN DEFAULT FALSE,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Idempotent column additions ───────────────────────────
    # Add ai_admin_override to users if not present
    cur.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_admin_override BOOLEAN DEFAULT FALSE
    """)

    # Add youtube_video_id to video history and bookmarks
    cur.execute("""
        ALTER TABLE chapter_video_history ADD COLUMN IF NOT EXISTS youtube_video_id TEXT DEFAULT NULL
    """)
    cur.execute("""
        ALTER TABLE chapter_video_bookmarks ADD COLUMN IF NOT EXISTS youtube_video_id TEXT DEFAULT NULL
    """)

    # Add reviewed_count to flashcard sets
    cur.execute("""
        ALTER TABLE chapter_flashcard_sets ADD COLUMN IF NOT EXISTS reviewed_count INTEGER DEFAULT 0
    """)

    # Add content extraction columns to chapter_uploads
    cur.execute("""
        ALTER TABLE chapter_uploads ADD COLUMN IF NOT EXISTS extracted_text TEXT DEFAULT NULL
    """)
    cur.execute("""
        ALTER TABLE chapter_uploads ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'pending'
    """)
    cur.execute("""
        ALTER TABLE chapter_uploads ADD COLUMN IF NOT EXISTS extraction_error TEXT DEFAULT NULL
    """)

    # ── School-scoped curriculum (B2B isolation) ──────────────
    # Add school_id to curriculum tables (NULL = global template)
    cur.execute("ALTER TABLE boards ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE")
    cur.execute("ALTER TABLE standards ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE")
    cur.execute("ALTER TABLE mediums ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE")
    cur.execute("ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE")
    cur.execute("ALTER TABLE curriculum ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE")
    cur.execute("ALTER TABLE chapters ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE")
    
    # Create indexes for school_id lookups
    cur.execute("CREATE INDEX IF NOT EXISTS idx_boards_school ON boards(school_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_standards_school ON standards(school_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_mediums_school ON mediums(school_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_curriculum_school ON curriculum(school_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapters_school ON chapters(school_id)")

    # ── School Teachers (B2B - school's own teachers) ──────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS school_teachers (
            id           SERIAL PRIMARY KEY,
            school_id    INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            name         TEXT NOT NULL,
            email        TEXT NOT NULL,
            phone        TEXT DEFAULT '',
            subjects     TEXT DEFAULT '[]',
            standards    TEXT DEFAULT '[]',
            is_active    BOOLEAN DEFAULT TRUE,
            notes        TEXT DEFAULT '',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (school_id, email)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_school_teachers_school ON school_teachers(school_id)")

    # ── Question Bank (school-scoped) ──────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id           SERIAL PRIMARY KEY,
            school_id    INTEGER REFERENCES schools(id) ON DELETE CASCADE,
            chapter_id   INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
            type         TEXT NOT NULL DEFAULT 'mcq',
            difficulty   TEXT DEFAULT 'medium',
            question     TEXT NOT NULL,
            options      TEXT DEFAULT '[]',
            correct_answer TEXT NOT NULL,
            explanation  TEXT DEFAULT '',
            tags         TEXT DEFAULT '[]',
            created_by   TEXT DEFAULT '',
            is_active    BOOLEAN DEFAULT TRUE,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Add school_id to existing questions table if missing
    cur.execute("ALTER TABLE questions ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_questions_school ON questions(school_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter_id)")

    # ── Media Library (school-scoped) ──────────────────────────
    cur.execute("""
        CREATE TABLE IF NOT EXISTS media_files (
            id           SERIAL PRIMARY KEY,
            school_id    INTEGER REFERENCES schools(id) ON DELETE CASCADE,
            name         TEXT NOT NULL,
            type         TEXT NOT NULL DEFAULT 'image',
            url          TEXT NOT NULL,
            thumbnail_url TEXT DEFAULT '',
            size_bytes   INTEGER DEFAULT 0,
            duration_sec INTEGER DEFAULT NULL,
            dimensions   TEXT DEFAULT '',
            subject_id   TEXT DEFAULT '',
            chapter_id   INTEGER DEFAULT NULL,
            created_by   TEXT DEFAULT '',
            is_active    BOOLEAN DEFAULT TRUE,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Add school_id to existing media_files table if missing
    cur.execute("ALTER TABLE media_files ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_media_school ON media_files(school_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_media_chapter ON media_files(chapter_id)")

    conn.commit()
    cur.close()
    conn.close()
    
    # Auto-seed AI prompts if table is empty
    _auto_seed_prompts()


def _auto_seed_prompts():
    """Auto-seed AI prompts from hardcoded values if ai_prompts table is empty."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as count FROM ai_prompts")
        row = cur.fetchone()
        count = row["count"] if row else 0
        
        if count == 0:
            # Table is empty - seed all prompts
            print("[Schema] ai_prompts table is empty, auto-seeding...")
            from app.modules.admin.service import AdminService
            result = AdminService.seed_prompts_from_hardcoded(overwrite=False)
            print(f"[Schema] Auto-seeded prompts: {result}")
        else:
            print(f"[Schema] ai_prompts table has {count} rows, skipping auto-seed")
    except Exception as e:
        print(f"[Schema] Auto-seed skipped (table may not exist yet): {e}")
    finally:
        conn.close()
