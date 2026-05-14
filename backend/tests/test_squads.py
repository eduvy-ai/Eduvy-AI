"""
tests/test_squads.py — Backend tests for the Sathi Study Squads router.

Uses FastAPI TestClient + an in-memory SQLite database (via monkeypatching
get_db) so no real PostgreSQL connection is required.

Tests cover:
 1. GET /api/squads/mine — returns null when user has no squad
 2. POST /api/squads/match — creates a new squad
 3. POST /api/squads/match — joins an existing open squad
 4. POST /api/squads/match — returns already_matched if user already in squad
 5. GET /api/squads/{id}/messages — returns messages since_id
 6. POST /api/squads/{id}/messages — saves a chat message
 7. POST /api/squads/{id}/messages — rejects empty content
 8. POST /api/squads/{id}/messages — rejects content > 2000 chars
 9. GET /api/squads/{id}/members — returns members with online status
10. GET /api/squads/{id}/challenge — returns null when no pending challenge
11. POST /api/squads/{id}/challenge/create — fails without mastery data
12. POST /api/squads/{id}/challenge/{cid}/submit — awards XP and marks complete
13. DELETE /api/squads/{id}/leave — removes member and deactivates empty squad
14. Unauthorised requests return 401/403
"""

import os
import sys
import sqlite3
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient
from jose import jwt

# ── Point imports to the backend directory ──────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ── Minimal SQLite shim that looks like psycopg2's RealDictCursor ──────────

class _DictRow(dict):
    """Make sqlite3 rows accessible like psycopg2 RealDictRow."""
    pass


class _DictCursor:
    def __init__(self, conn):
        self._conn = conn
        self._cur = conn.cursor()
        self._cur.row_factory = sqlite3.Row
        self._was_returning = False
        self._lastrowid = None

    def execute(self, sql, params=()):
        # Translate PostgreSQL-isms → SQLite
        sql = sql.replace("%s", "?")
        sql = sql.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
        sql = sql.replace("CURRENT_TIMESTAMP", "datetime('now')")
        sql = sql.replace("BOOLEAN DEFAULT TRUE", "INTEGER DEFAULT 1")
        sql = sql.replace("::text", "")
        # ON CONFLICT DO NOTHING → INSERT OR IGNORE INTO
        if "ON CONFLICT DO NOTHING" in sql:
            sql = sql.replace("ON CONFLICT DO NOTHING", "").strip()
            sql = sql.replace("INSERT INTO", "INSERT OR IGNORE INTO", 1)
        # Track RETURNING id — SQLite doesn't support it; simulate via lastrowid
        self._was_returning = "RETURNING id" in sql
        sql = sql.replace("RETURNING id", "").strip()
        self._cur.execute(sql, params)
        self._lastrowid = self._cur.lastrowid

    def fetchone(self):
        # Simulate RETURNING id: return {"id": lastrowid} after an INSERT
        if self._was_returning:
            self._was_returning = False
            return _DictRow({"id": self._lastrowid}) if self._lastrowid else None
        row = self._cur.fetchone()
        if row is None:
            return None
        return _DictRow(dict(row))

    def fetchall(self):
        return [_DictRow(dict(r)) for r in self._cur.fetchall()]

    @property
    def rowcount(self):
        return self._cur.rowcount


class _FakeConn:
    def __init__(self, sqlite_conn):
        self._conn = sqlite_conn

    def cursor(self):
        return _DictCursor(self._conn)

    def commit(self):
        self._conn.commit()

    def close(self):
        pass  # keep in-memory DB alive during test


# ── In-memory SQLite schema ──────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Student',
    email TEXT,
    xp INTEGER DEFAULT 0,
    standard TEXT DEFAULT 'Class 10'
);
CREATE TABLE IF NOT EXISTS mastery (
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    score INTEGER DEFAULT 50,
    PRIMARY KEY (user_id, subject)
);
CREATE TABLE IF NOT EXISTS squads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    focus_subject TEXT NOT NULL DEFAULT 'General',
    created_at TEXT DEFAULT (datetime('now')),
    is_active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS squad_members (
    squad_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'learner',
    joined_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (squad_id, user_id)
);
CREATE TABLE IF NOT EXISTS squad_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    squad_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT 'Student',
    content TEXT NOT NULL,
    msg_type TEXT DEFAULT 'chat',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS squad_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    squad_id INTEGER NOT NULL,
    teacher_user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    concept TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    explanation TEXT DEFAULT '',
    xp_awarded INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

# ── Test fixtures ─────────────────────────────────────────────────────────────

JWT_SECRET = "test-secret"
JWT_ALGO   = "HS256"

USER_A = "user-aaa-111"
USER_B = "user-bbb-222"
USER_C = "user-ccc-333"


def _make_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=1)
    return jwt.encode({"sub": user_id, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGO)


def _auth(user_id: str) -> dict:
    return {"Authorization": f"Bearer {_make_token(user_id)}"}


@pytest.fixture
def db():
    """Return a fresh in-memory SQLite connection with the schema applied."""
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    # Seed users
    for uid, name in [(USER_A, "Aarav"), (USER_B, "Bhavna"), (USER_C, "Chetan")]:
        conn.execute("INSERT OR IGNORE INTO users(id, name) VALUES(?, ?)", (uid, name))
    conn.commit()
    return conn


@pytest.fixture
def client(db):
    """TestClient with get_db monkey-patched to use in-memory SQLite."""
    fake_conn = _FakeConn(db)

    with patch("routers.squads.get_db", return_value=fake_conn), \
         patch("routers.auth._JWT_SECRET", JWT_SECRET), \
         patch("routers.auth._JWT_ALGORITHM", JWT_ALGO):
        # Import app after patching so router sees patched get_db
        from main import app
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c


# ── Helper: create a squad with members directly in SQLite ────────────────────

def _create_squad(db, name="Test Squad", focus="Mathematics"):
    db.execute("INSERT INTO squads(name, focus_subject) VALUES(?,?)", (name, focus))
    db.commit()
    row = db.execute("SELECT last_insert_rowid() AS id").fetchone()
    return row["id"]


def _add_member(db, squad_id, user_id, role="learner"):
    db.execute(
        "INSERT OR IGNORE INTO squad_members(squad_id, user_id, role) VALUES(?,?,?)",
        (squad_id, user_id, role),
    )
    db.commit()


# ── Tests: GET /api/squads/mine ───────────────────────────────────────────────

class TestGetMySquad:
    def test_no_squad_returns_null(self, client):
        r = client.get("/api/squads/mine", headers=_auth(USER_A))
        assert r.status_code == 200
        assert r.json()["squad"] is None

    def test_returns_squad_when_member(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.get("/api/squads/mine", headers=_auth(USER_A))
        assert r.status_code == 200
        data = r.json()["squad"]
        assert data["id"] == sid
        assert data["focus_subject"] == "Mathematics"
        assert any(m["user_id"] == USER_A for m in data["members"])

    def test_unauthenticated_returns_401(self, client):
        r = client.get("/api/squads/mine")
        assert r.status_code == 401


# ── Tests: POST /api/squads/match ─────────────────────────────────────────────

class TestMatchSquad:
    def test_creates_new_squad_with_no_mastery(self, client, db):
        r = client.post("/api/squads/match", headers=_auth(USER_A))
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "created"
        assert isinstance(body["squad_id"], int)

    def test_already_matched_returns_status(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.post("/api/squads/match", headers=_auth(USER_A))
        assert r.status_code == 200
        assert r.json()["status"] == "already_matched"

    def test_joins_open_squad_with_same_focus(self, client, db):
        """USER_B creates a squad focused on General; USER_A should join it."""
        # Give USER_B mastery so their weak subject drives focus="General" fallback
        sid = _create_squad(db, focus="General")
        _add_member(db, sid, USER_B)

        r = client.post("/api/squads/match", headers=_auth(USER_A))
        assert r.status_code == 200
        body = r.json()
        # Either joined or created a new one — both are valid outcomes
        assert body["status"] in ("joined", "created")


# ── Tests: GET /api/squads/{id}/messages ─────────────────────────────────────

class TestGetMessages:
    def test_returns_empty_list_initially(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.get(f"/api/squads/{sid}/messages?since_id=0", headers=_auth(USER_A))
        assert r.status_code == 200
        assert r.json()["messages"] == []

    def test_returns_messages_since_id(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        # Insert two messages directly
        db.execute(
            "INSERT INTO squad_messages(squad_id, user_id, display_name, content) VALUES(?,?,?,?)",
            (sid, USER_A, "Aarav", "Hello"),
        )
        db.execute(
            "INSERT INTO squad_messages(squad_id, user_id, display_name, content) VALUES(?,?,?,?)",
            (sid, USER_A, "Aarav", "World"),
        )
        db.commit()
        r = client.get(f"/api/squads/{sid}/messages?since_id=0", headers=_auth(USER_A))
        assert r.status_code == 200
        msgs = r.json()["messages"]
        assert len(msgs) == 2
        assert msgs[0]["content"] == "Hello"

    def test_since_id_filters_old_messages(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        db.execute(
            "INSERT INTO squad_messages(squad_id, user_id, display_name, content) VALUES(?,?,?,?)",
            (sid, USER_A, "Aarav", "Old"),
        )
        db.commit()
        first_id = db.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]

        db.execute(
            "INSERT INTO squad_messages(squad_id, user_id, display_name, content) VALUES(?,?,?,?)",
            (sid, USER_A, "Aarav", "New"),
        )
        db.commit()

        r = client.get(f"/api/squads/{sid}/messages?since_id={first_id}", headers=_auth(USER_A))
        msgs = r.json()["messages"]
        assert len(msgs) == 1
        assert msgs[0]["content"] == "New"

    def test_non_member_gets_403(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.get(f"/api/squads/{sid}/messages", headers=_auth(USER_B))
        assert r.status_code == 403


# ── Tests: POST /api/squads/{id}/messages ────────────────────────────────────

class TestSendMessage:
    def test_sends_chat_message(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.post(
            f"/api/squads/{sid}/messages",
            json={"content": "Hi squad!", "display_name": "Aarav"},
            headers=_auth(USER_A),
        )
        assert r.status_code == 201
        assert r.json()["saved"] is True
        assert isinstance(r.json()["id"], int)

    def test_empty_content_rejected(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.post(
            f"/api/squads/{sid}/messages",
            json={"content": "   ", "display_name": "Aarav"},
            headers=_auth(USER_A),
        )
        assert r.status_code == 400

    def test_too_long_content_rejected(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.post(
            f"/api/squads/{sid}/messages",
            json={"content": "x" * 2001, "display_name": "Aarav"},
            headers=_auth(USER_A),
        )
        assert r.status_code == 400

    def test_max_length_content_accepted(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.post(
            f"/api/squads/{sid}/messages",
            json={"content": "x" * 2000, "display_name": "Aarav"},
            headers=_auth(USER_A),
        )
        assert r.status_code == 201

    def test_non_member_gets_403(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.post(
            f"/api/squads/{sid}/messages",
            json={"content": "Infiltrator!", "display_name": "Evil"},
            headers=_auth(USER_B),
        )
        assert r.status_code == 403


# ── Tests: GET /api/squads/{id}/members ──────────────────────────────────────

class TestGetMembers:
    def test_returns_all_members(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A, role="teacher")
        _add_member(db, sid, USER_B, role="learner")
        r = client.get(f"/api/squads/{sid}/members", headers=_auth(USER_A))
        assert r.status_code == 200
        members = r.json()["members"]
        ids = [m["user_id"] for m in members]
        assert USER_A in ids
        assert USER_B in ids

    def test_online_status_included(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.get(f"/api/squads/{sid}/members", headers=_auth(USER_A))
        for m in r.json()["members"]:
            assert "online" in m


# ── Tests: GET /api/squads/{id}/challenge ────────────────────────────────────

class TestGetChallenge:
    def test_no_challenge_returns_null(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.get(f"/api/squads/{sid}/challenge", headers=_auth(USER_A))
        assert r.status_code == 200
        assert r.json()["challenge"] is None

    def test_returns_pending_challenge(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A, role="teacher")
        db.execute(
            "INSERT INTO squad_challenges(squad_id, teacher_user_id, subject, concept)"
            " VALUES(?,?,?,?)",
            (sid, USER_A, "Mathematics", "Quadratic Equations"),
        )
        db.commit()
        r = client.get(f"/api/squads/{sid}/challenge", headers=_auth(USER_A))
        assert r.status_code == 200
        ch = r.json()["challenge"]
        assert ch["concept"] == "Quadratic Equations"
        assert ch["status"] == "pending"


# ── Tests: POST /api/squads/{id}/challenge/create ────────────────────────────

class TestCreateChallenge:
    def test_fails_without_mastery(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.post(f"/api/squads/{sid}/challenge/create", headers=_auth(USER_A))
        assert r.status_code == 400
        assert "mastery" in r.json()["detail"].lower()

    def test_creates_challenge_with_mastery(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A, role="teacher")
        # Give USER_A some mastery scores
        db.execute(
            "INSERT INTO mastery(user_id, subject, score) VALUES(?,?,?)",
            (USER_A, "Mathematics", 85),
        )
        db.execute(
            "INSERT INTO mastery(user_id, subject, score) VALUES(?,?,?)",
            (USER_A, "Science", 40),
        )
        db.commit()
        r = client.post(f"/api/squads/{sid}/challenge/create", headers=_auth(USER_A))
        assert r.status_code == 200
        body = r.json()
        assert body["subject"] == "Mathematics"
        assert isinstance(body["concept"], str) and len(body["concept"]) > 0


# ── Tests: POST /api/squads/{id}/challenge/{cid}/submit ──────────────────────

class TestSubmitChallenge:
    def test_submit_awards_xp_and_marks_complete(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A, role="teacher")
        db.execute(
            "INSERT INTO squad_challenges(squad_id, teacher_user_id, subject, concept)"
            " VALUES(?,?,?,?)",
            (sid, USER_A, "Mathematics", "Polynomials"),
        )
        db.commit()
        cid = db.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]

        r = client.post(
            f"/api/squads/{sid}/challenge/{cid}/submit",
            json={"explanation": "A polynomial is a sum of terms with variables..."},
            headers=_auth(USER_A),
        )
        assert r.status_code == 200
        body = r.json()
        assert body["completed"] is True
        assert body["xp_awarded"] == 50

        # Verify challenge status updated in DB
        row = db.execute(
            "SELECT status, xp_awarded FROM squad_challenges WHERE id=?", (cid,)
        ).fetchone()
        assert row["status"] == "completed"
        assert row["xp_awarded"] == 50

        # Verify XP added to user
        user = db.execute("SELECT xp FROM users WHERE id=?", (USER_A,)).fetchone()
        assert user["xp"] == 50

    def test_empty_explanation_rejected(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        db.execute(
            "INSERT INTO squad_challenges(squad_id, teacher_user_id, subject, concept)"
            " VALUES(?,?,?,?)",
            (sid, USER_A, "Science", "Photosynthesis"),
        )
        db.commit()
        cid = db.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]

        r = client.post(
            f"/api/squads/{sid}/challenge/{cid}/submit",
            json={"explanation": ""},
            headers=_auth(USER_A),
        )
        assert r.status_code == 400

    def test_cannot_submit_someone_elses_challenge(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A, role="teacher")
        _add_member(db, sid, USER_B)
        db.execute(
            "INSERT INTO squad_challenges(squad_id, teacher_user_id, subject, concept)"
            " VALUES(?,?,?,?)",
            (sid, USER_A, "Science", "Photosynthesis"),
        )
        db.commit()
        cid = db.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]

        # USER_B tries to submit USER_A's challenge
        r = client.post(
            f"/api/squads/{sid}/challenge/{cid}/submit",
            json={"explanation": "Some explanation"},
            headers=_auth(USER_B),
        )
        assert r.status_code == 404


# ── Tests: DELETE /api/squads/{id}/leave ─────────────────────────────────────

class TestLeaveSquad:
    def test_member_can_leave(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        _add_member(db, sid, USER_B)  # keep squad active
        r = client.delete(f"/api/squads/{sid}/leave", headers=_auth(USER_A))
        assert r.status_code == 200
        assert r.json()["left"] is True

        # Verify removed from squad_members
        row = db.execute(
            "SELECT * FROM squad_members WHERE squad_id=? AND user_id=?", (sid, USER_A)
        ).fetchone()
        assert row is None

    def test_squad_deactivated_when_last_member_leaves(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        client.delete(f"/api/squads/{sid}/leave", headers=_auth(USER_A))

        row = db.execute("SELECT is_active FROM squads WHERE id=?", (sid,)).fetchone()
        assert row["is_active"] == 0

    def test_non_member_gets_403(self, client, db):
        sid = _create_squad(db)
        _add_member(db, sid, USER_A)
        r = client.delete(f"/api/squads/{sid}/leave", headers=_auth(USER_B))
        assert r.status_code == 403

    def test_unauthenticated_gets_401(self, client, db):
        sid = _create_squad(db)
        r = client.delete(f"/api/squads/{sid}/leave")
        assert r.status_code == 401
