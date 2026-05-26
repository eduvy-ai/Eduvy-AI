"""
tests/conftest.py
=================
Shared fixtures for ALL backend tests.

Strategy
--------
* Every test gets a fresh in-memory SQLite database.
* A psycopg2-style shim (_DictCursor / _FakeConn) translates the
  PostgreSQL dialect used in the services into SQLite-compatible SQL.
* `get_db` is monkey-patched in every service module so no real
  PostgreSQL connection is ever needed.
* JWT tokens are created with the application's default secret so the
  real auth dependency works without further patching.
"""

import os
import re
import sys
import sqlite3
import uuid
from contextlib import ExitStack
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from jose import jwt

# ── Make sure the backend root AND tests/ dir are importable ─────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))  # backend/
sys.path.insert(0, os.path.dirname(__file__))                   # tests/

# ── Auth constants (match app defaults so real decode_token works) ────────────
JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
JWT_ALGO   = "HS256"

# ── Stable test identities ────────────────────────────────────────────────────
USER_A   = "test-user-aaaa"
USER_B   = "test-user-bbbb"
ADMIN_ID = 1

# ── Service modules that hold a local `get_db` reference ─────────────────────
_GET_DB_PATCHES = [
    "app.db.repositories.base.get_db",
    "app.modules.admin.service.get_db",
    "app.modules.ai.service.get_db",
    "app.modules.bhool.service.get_db",
    "app.modules.curriculum.service.get_db",
    "app.modules.drishti.service.get_db",
    "app.modules.mastery.service.get_db",
    "app.modules.muqabla.service.get_db",
    "app.modules.notebook.service.get_db",
    "app.modules.parent.service.get_db",
    "app.modules.payments.service.get_db",
    "app.modules.quiz_stats.service.get_db",
    "app.modules.referrals.service.get_db",
    "app.modules.sessions.service.get_db",
    "app.modules.squads.service.get_db",
]

# ═══════════════════════════════════════════════════════════════════════════════
#  SQLite shim
# ═══════════════════════════════════════════════════════════════════════════════

class _DictRow(dict):
    """Dict subclass that mimics psycopg2 RealDictRow."""


class _DictCursor:
    """psycopg2-style cursor backed by an in-memory SQLite connection."""

    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn
        self._cur  = conn.cursor()
        self._cur.row_factory = sqlite3.Row
        self._cached_return   = None   # set by RETURNING simulation
        self._return_table    = None
        self._return_mode     = None   # 'id' or 'star'

    # ── SQL translation ───────────────────────────────────────────────────────

    def _translate(self, sql: str) -> str:
        """Transform PostgreSQL SQL into SQLite-compatible SQL.

        Side-effects: sets self._return_table / self._return_mode when a
        RETURNING clause is detected.
        """
        self._return_table = None
        self._return_mode  = None

        # 1.  Detect & strip RETURNING (must happen before other rewrites)
        m = re.search(r"\s+RETURNING\s+([\w*][^;]*?)(?:\s*;|\s*$)", sql, re.I)
        if m:
            cols = m.group(1).strip()
            self._return_mode = "id" if cols.lower() == "id" else "star"
            tbl_m = re.search(
                r"(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE)\s+(\w+)", sql, re.I
            )
            self._return_table = tbl_m.group(1).lower() if tbl_m else ""
            sql = sql[: m.start()].rstrip()

        # 2. Parameter placeholder
        sql = sql.replace("%s", "?")

        # 3. Type keywords
        sql = re.sub(r"\bSERIAL\b",   "INTEGER",                         sql, flags=re.I)
        sql = re.sub(r"\bBIGINT\b",   "INTEGER",                         sql, flags=re.I)
        sql = re.sub(r"\bBOOLEAN\s+DEFAULT\s+TRUE\b",  "INTEGER DEFAULT 1", sql, flags=re.I)
        sql = re.sub(r"\bBOOLEAN\s+DEFAULT\s+FALSE\b", "INTEGER DEFAULT 0", sql, flags=re.I)
        sql = re.sub(r"\bBOOLEAN\b",  "INTEGER",                         sql, flags=re.I)
        sql = re.sub(
            r"\bTIMESTAMP\s+DEFAULT\s+CURRENT_TIMESTAMP\b",
            "TEXT DEFAULT (datetime('now'))", sql, flags=re.I,
        )
        sql = re.sub(r"\bTIMESTAMP\b", "TEXT",             sql, flags=re.I)
        sql = re.sub(r"\bCURRENT_TIMESTAMP\b", "datetime('now')", sql, flags=re.I)
        sql = re.sub(r"\bCURRENT_DATE\b",      "date('now')",     sql, flags=re.I)
        sql = re.sub(r"\bNOW\(\)",             "datetime('now')", sql, flags=re.I)

        # 4. Type casts  ::text  ::integer  etc.
        sql = re.sub(r"::\w+", "", sql)

        # 5.  ON CONFLICT DO NOTHING  →  INSERT OR IGNORE
        if re.search(r"ON\s+CONFLICT\s+DO\s+NOTHING", sql, re.I):
            sql = re.sub(r"ON\s+CONFLICT\s+DO\s+NOTHING", "", sql, flags=re.I)
            sql = re.sub(r"\bINSERT\s+INTO\b", "INSERT OR IGNORE INTO", sql, flags=re.I, count=1)

        # 6. Remove FK REFERENCES (SQLite doesn't enforce without pragma)
        sql = re.sub(
            r"\s+REFERENCES\s+\w+\s*\([^)]+\)(?:\s+ON\s+\w+\s+\w+)*",
            "", sql, flags=re.I,
        )

        # 7. ILIKE → LIKE
        sql = re.sub(r"\bILIKE\b", "LIKE", sql, flags=re.I)

        # 8. IF NOT EXISTS in ALTER TABLE (SQLite doesn't support it)
        if re.search(r"ALTER\s+TABLE.*ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS", sql, re.I):
            sql = re.sub(r"IF\s+NOT\s+EXISTS\s+", "", sql, flags=re.I)

        return sql.strip()

    # ── Core execute ──────────────────────────────────────────────────────────

    def execute(self, sql: str, params=()):
        original_sql = sql
        is_update    = bool(re.match(r"^\s*UPDATE\s", sql, re.I))
        translated   = self._translate(sql)

        self._cached_return = None
        try:
            self._cur.execute(translated, params if params else ())
        except sqlite3.OperationalError as exc:
            if "duplicate column name" in str(exc).lower():
                return   # idempotent ALTER TABLE – skip silently
            raise

        lastrowid = self._cur.lastrowid

        # ── Simulate RETURNING ──────────────────────────────────────────────
        if not self._return_table:
            return

        if self._return_mode == "id":
            self._cached_return = _DictRow({"id": lastrowid})
            return

        # RETURNING *
        if is_update:
            where_m = re.search(
                r"\bWHERE\b(.+?)(?:\bRETURNING\b|$)", original_sql, re.I | re.S
            )
            if where_m:
                where_clause = where_m.group(1).strip()
                where_clause = re.sub(r"%s", "?", where_clause)
                where_clause = re.sub(r"::\w+", "", where_clause)
                set_m = re.search(
                    r"\bSET\b(.+?)\bWHERE\b", original_sql, re.I | re.S
                )
                n_set = set_m.group(1).count("%s") if set_m else 0
                where_params = list(params)[n_set:] if params else []
                try:
                    self._cur.execute(
                        f"SELECT * FROM {self._return_table} WHERE {where_clause}",
                        where_params,
                    )
                    row = self._cur.fetchone()
                    self._cached_return = _DictRow(dict(row)) if row else None
                except Exception:
                    pass
        else:
            # INSERT → re-select by rowid
            try:
                self._cur.execute(
                    f"SELECT * FROM {self._return_table} WHERE rowid = ?",
                    (lastrowid,),
                )
                row = self._cur.fetchone()
                self._cached_return = _DictRow(dict(row)) if row else None
            except Exception:
                self._cached_return = _DictRow({"id": lastrowid})

    # ── Fetch methods ─────────────────────────────────────────────────────────

    def fetchone(self):
        if self._cached_return is not None:
            row, self._cached_return = self._cached_return, None
            return row
        row = self._cur.fetchone()
        return _DictRow(dict(row)) if row is not None else None

    def fetchall(self):
        return [_DictRow(dict(r)) for r in self._cur.fetchall()]

    @property
    def rowcount(self):
        return self._cur.rowcount

    @property
    def lastrowid(self):
        return self._cur.lastrowid


class _FakeConn:
    """psycopg2-style connection wrapper backed by SQLite."""

    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    def cursor(self):
        return _DictCursor(self._conn)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        try:
            self._conn.rollback()
        except Exception:
            pass

    def close(self):
        pass   # keep in-memory DB alive across the test


# ═══════════════════════════════════════════════════════════════════════════════
#  SQLite schema (SQLite-compatible version of schema.py)
# ═══════════════════════════════════════════════════════════════════════════════

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id               TEXT PRIMARY KEY,
    email            TEXT UNIQUE DEFAULT '',
    password_hash    TEXT DEFAULT '',
    name             TEXT NOT NULL DEFAULT 'Student',
    mobile           TEXT DEFAULT '',
    parent_mobile    TEXT DEFAULT '',
    standard         TEXT DEFAULT 'Class 10',
    board            TEXT DEFAULT 'CBSE',
    language         TEXT DEFAULT 'English',
    display_language TEXT DEFAULT 'medium',
    subjects         TEXT DEFAULT '[]',
    xp               INTEGER DEFAULT 0,
    streak           INTEGER DEFAULT 1,
    last_active      TEXT DEFAULT '',
    ai_provider      TEXT DEFAULT 'gemini',
    ai_model         TEXT DEFAULT 'gemini-2.0-flash',
    ai_key           TEXT DEFAULT '',
    ai_keys          TEXT DEFAULT '{}',
    plan             TEXT DEFAULT 'free',
    plan_expires_at  TEXT DEFAULT '',
    school           TEXT DEFAULT '',
    referral_code    TEXT DEFAULT '',
    referred_by      TEXT DEFAULT '',
    is_admin         INTEGER DEFAULT 0,
    is_drishti       INTEGER DEFAULT 0,
    ai_admin_override INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT (date('now'))
);
CREATE TABLE IF NOT EXISTS mastery (
    user_id    TEXT NOT NULL,
    subject    TEXT NOT NULL,
    score      INTEGER DEFAULT 50,
    updated_at TEXT DEFAULT (date('now')),
    PRIMARY KEY (user_id, subject)
);
CREATE TABLE IF NOT EXISTS quiz_results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    subject    TEXT NOT NULL,
    difficulty TEXT DEFAULT 'Medium',
    correct    INTEGER DEFAULT 0,
    total      INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS notebook_sources (
    id       TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    name     TEXT NOT NULL,
    type     TEXT DEFAULT 'text',
    content  TEXT DEFAULT '',
    icon     TEXT DEFAULT '📄',
    added_at INTEGER DEFAULT 0,
    PRIMARY KEY (id, user_id)
);
CREATE TABLE IF NOT EXISTS notebook_chats (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS notebook_studio (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    type        TEXT NOT NULL,
    output_json TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bhool_cards (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id        TEXT NOT NULL,
    subject        TEXT NOT NULL DEFAULT 'General',
    standard       TEXT DEFAULT 'Class 10',
    question       TEXT NOT NULL,
    wrong_answer   TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    why_wrong      TEXT DEFAULT '',
    is_published   INTEGER DEFAULT 0,
    bhool_coins    INTEGER DEFAULT 0,
    created_at     TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bhool_collections (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    card_id      TEXT NOT NULL,
    collected_at TEXT DEFAULT (datetime('now')),
    UNIQUE (user_id, card_id)
);
CREATE TABLE IF NOT EXISTS bhool_reactions (
    card_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    emoji   TEXT NOT NULL DEFAULT '👍',
    PRIMARY KEY (card_id, user_id)
);
CREATE TABLE IF NOT EXISTS muqabla_battles (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    challenger_id    TEXT NOT NULL,
    opponent_id      TEXT DEFAULT '',
    subject          TEXT NOT NULL,
    standard         TEXT NOT NULL DEFAULT 'Class 10',
    status           TEXT DEFAULT 'open',
    challenger_score INTEGER DEFAULT 0,
    opponent_score   INTEGER DEFAULT 0,
    questions_json   TEXT DEFAULT '[]',
    created_at       TEXT DEFAULT (datetime('now')),
    completed_at     TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS parent_pins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL UNIQUE,
    pin        TEXT NOT NULL UNIQUE,
    is_active  INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS squads (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    focus_subject TEXT NOT NULL DEFAULT 'General',
    standard      TEXT NOT NULL DEFAULT 'Class 10',
    medium        TEXT NOT NULL DEFAULT 'English',
    created_at    TEXT DEFAULT (datetime('now')),
    is_active     INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS squad_members (
    squad_id     INTEGER NOT NULL,
    user_id      TEXT NOT NULL,
    role         TEXT DEFAULT 'learner',
    joined_at    TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (squad_id, user_id)
);
CREATE TABLE IF NOT EXISTS squad_messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    squad_id     INTEGER NOT NULL,
    user_id      TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT 'Student',
    content      TEXT NOT NULL,
    msg_type     TEXT DEFAULT 'chat',
    created_at   TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS squad_challenges (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    squad_id   INTEGER NOT NULL,
    subject    TEXT NOT NULL DEFAULT 'General',
    concept    TEXT NOT NULL DEFAULT 'Key Concept',
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS squad_challenge_submissions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL,
    user_id      TEXT NOT NULL,
    explanation  TEXT NOT NULL,
    xp_awarded   INTEGER DEFAULT 0,
    ai_verdict   TEXT DEFAULT '',
    ai_note      TEXT DEFAULT '',
    created_at   TEXT DEFAULT (datetime('now')),
    UNIQUE (challenge_id, user_id)
);
CREATE TABLE IF NOT EXISTS squad_doubts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    squad_id     INTEGER NOT NULL,
    user_id      TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT 'Student',
    subject      TEXT DEFAULT '',
    question     TEXT NOT NULL,
    created_at   TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS squad_doubt_answers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    doubt_id     INTEGER NOT NULL,
    user_id      TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT 'Student',
    content      TEXT NOT NULL,
    upvotes      INTEGER DEFAULT 0,
    ai_verdict   TEXT DEFAULT '',
    ai_note      TEXT DEFAULT '',
    created_at   TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS squad_doubt_upvotes (
    answer_id INTEGER NOT NULL,
    user_id   TEXT NOT NULL,
    PRIMARY KEY (answer_id, user_id)
);
CREATE TABLE IF NOT EXISTS squad_doubt_daily_counts (
    user_id TEXT NOT NULL,
    day     TEXT NOT NULL,
    count   INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, day)
);
CREATE TABLE IF NOT EXISTS squad_daily_concepts (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    squad_id INTEGER NOT NULL,
    subject  TEXT NOT NULL DEFAULT 'General',
    concept  TEXT NOT NULL,
    day      TEXT NOT NULL,
    UNIQUE (squad_id, day)
);
CREATE TABLE IF NOT EXISTS squad_daily_submissions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    squad_id     INTEGER NOT NULL,
    day          TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    explanation  TEXT NOT NULL,
    xp_awarded   INTEGER DEFAULT 0,
    ai_verdict   TEXT DEFAULT '',
    ai_note      TEXT DEFAULT '',
    created_at   TEXT DEFAULT (datetime('now')),
    UNIQUE (squad_id, day, user_id)
);
CREATE TABLE IF NOT EXISTS squad_streaks (
    squad_id       INTEGER NOT NULL,
    user_id        TEXT NOT NULL,
    current_streak INTEGER DEFAULT 0,
    last_active    TEXT DEFAULT '',
    PRIMARY KEY (squad_id, user_id)
);
CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT 'Admin',
    role          TEXT NOT NULL DEFAULT 'superadmin',
    created_at    TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS boards (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active  INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS standards (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    grade_num  INTEGER NOT NULL DEFAULT 10,
    sort_order INTEGER DEFAULT 0,
    is_active  INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS mediums (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active  INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS curriculum (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id    TEXT NOT NULL,
    standard_id TEXT NOT NULL,
    medium_id   TEXT NOT NULL,
    subjects    TEXT DEFAULT '[]',
    is_active   INTEGER DEFAULT 1,
    UNIQUE (board_id, standard_id, medium_id)
);
CREATE TABLE IF NOT EXISTS ai_usage (
    user_id           TEXT NOT NULL,
    date              TEXT NOT NULL,
    call_count        INTEGER DEFAULT 0,
    prompt_tokens     INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS drishti_helpers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    helper_name  TEXT NOT NULL,
    helper_email TEXT UNIQUE NOT NULL,
    helper_type  TEXT NOT NULL DEFAULT 'teacher',
    helper_token TEXT UNIQUE NOT NULL,
    notes        TEXT DEFAULT '',
    is_active    INTEGER DEFAULT 1,
    created_at   TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS drishti_assignments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    helper_id   INTEGER NOT NULL,
    student_id  TEXT NOT NULL,
    is_active   INTEGER DEFAULT 1,
    assigned_at TEXT DEFAULT (datetime('now')),
    UNIQUE (helper_id, student_id)
);
CREATE TABLE IF NOT EXISTS helper_notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    helper_id  INTEGER NOT NULL,
    student_id TEXT NOT NULL,
    message    TEXT NOT NULL,
    is_read    INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS payments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        TEXT NOT NULL,
    plan           TEXT NOT NULL,
    amount         INTEGER NOT NULL,
    currency       TEXT DEFAULT 'INR',
    razorpay_order TEXT DEFAULT '',
    razorpay_pay   TEXT DEFAULT '',
    status         TEXT DEFAULT 'pending',
    created_at     TEXT DEFAULT (datetime('now')),
    completed_at   TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS chat_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    session    TEXT NOT NULL,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS user_drafts (
    user_id   TEXT NOT NULL,
    draft_key TEXT NOT NULL,
    content   TEXT NOT NULL DEFAULT '',
    extra     TEXT NOT NULL DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, draft_key)
);
"""

# ═══════════════════════════════════════════════════════════════════════════════
#  Token helpers (exported for use in test files)
# ═══════════════════════════════════════════════════════════════════════════════

def make_token(user_id: str, hours: int = 2) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=hours)
    return jwt.encode({"sub": user_id, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGO)


def make_admin_token(admin_id: int = ADMIN_ID) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=2)
    return jwt.encode(
        {"sub": str(admin_id), "role": "admin", "exp": exp},
        JWT_SECRET, algorithm=JWT_ALGO,
    )


def auth_headers(user_id: str) -> dict:
    return {"Authorization": f"Bearer {make_token(user_id)}"}


def admin_headers() -> dict:
    return {"Authorization": f"Bearer {make_admin_token()}"}


# ═══════════════════════════════════════════════════════════════════════════════
#  Pytest fixtures
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture()
def db():
    """Fresh in-memory SQLite DB with schema + seeded users for every test."""
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    conn.execute(
        "INSERT INTO users(id,email,name,standard,board) VALUES(?,?,?,?,?)",
        (USER_A, "usera@test.com", "Aarav", "Class 10", "CBSE"),
    )
    conn.execute(
        "INSERT INTO users(id,email,name,standard,board) VALUES(?,?,?,?,?)",
        (USER_B, "userb@test.com", "Bhavna", "Class 10", "CBSE"),
    )
    conn.commit()
    return conn


@pytest.fixture()
def client(db):
    """TestClient with all service get_db calls patched to the in-memory DB."""
    fake   = _FakeConn(db)
    factory = lambda: fake

    with ExitStack() as stack:
        for target in _GET_DB_PATCHES:
            stack.enter_context(patch(target, factory))

        from app.main_new import app
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c
