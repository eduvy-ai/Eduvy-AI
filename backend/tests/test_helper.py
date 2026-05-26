"""
tests/test_helper.py
====================
Tests for Drishti Helper Portal:
  GET  /api/helper/me
  GET  /api/helper/students
  POST /api/helper/notes

Authentication uses the X-Helper-Token header (not JWT).
"""
import uuid
import pytest
from conftest import USER_A, USER_B

HELPER_TOKEN = "test-helper-token-abc123"

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def helper(db):
    """Seed a drishti helper and assign USER_A as their student."""
    db.execute(
        """INSERT INTO drishti_helpers
           (helper_name, helper_email, helper_type, helper_token, is_active)
           VALUES(?,?,?,?,?)""",
        ("Test Helper", "helper@school.com", "teacher", HELPER_TOKEN, 1),
    )
    db.commit()
    row = db.execute("SELECT id FROM drishti_helpers WHERE helper_token=?",
                     (HELPER_TOKEN,)).fetchone()
    helper_id = row[0]

    db.execute(
        "INSERT INTO drishti_assignments(helper_id,student_id,is_active) VALUES(?,?,?)",
        (helper_id, USER_A, 1),
    )
    db.commit()
    return {"id": helper_id, "token": HELPER_TOKEN}


def _helper_headers(token=HELPER_TOKEN):
    return {"X-Helper-Token": token}


# ═══════════════════════════════════════════════════════════════════════════════
#  /api/helper/me
# ═══════════════════════════════════════════════════════════════════════════════

def test_helper_me_success(client, helper):
    r = client.get("/api/helper/me", headers=_helper_headers())
    assert r.status_code == 200
    data = r.json()
    assert data["helper_email"] == "helper@school.com"
    assert data["helper_name"] == "Test Helper"


def test_helper_me_invalid_token(client):
    r = client.get("/api/helper/me", headers={"X-Helper-Token": "invalid-token"})
    assert r.status_code == 401


def test_helper_me_no_token(client):
    r = client.get("/api/helper/me")
    assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
#  /api/helper/students
# ═══════════════════════════════════════════════════════════════════════════════

def test_helper_students_success(client, helper):
    r = client.get("/api/helper/students", headers=_helper_headers())
    assert r.status_code == 200
    students = r.json()
    assert isinstance(students, list)
    ids = [s["id"] for s in students]
    assert USER_A in ids


def test_helper_students_no_assignments(client, db):
    """A helper with no assigned students returns an empty list."""
    token = "helper-no-students-xyz"
    db.execute(
        "INSERT INTO drishti_helpers(helper_name,helper_email,helper_type,helper_token,is_active)"
        " VALUES(?,?,?,?,?)",
        ("Empty Helper", "empty@school.com", "teacher", token, 1),
    )
    db.commit()
    r = client.get("/api/helper/students", headers={"X-Helper-Token": token})
    assert r.status_code == 200
    assert r.json() == []


def test_helper_students_invalid_token(client):
    r = client.get("/api/helper/students", headers={"X-Helper-Token": "bad"})
    assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
#  /api/helper/notes
# ═══════════════════════════════════════════════════════════════════════════════

def test_helper_post_note(client, helper):
    r = client.post("/api/helper/notes", json={
        "student_id": USER_A,
        "message": "Aarav needs to practice algebra more.",
    }, headers=_helper_headers())
    assert r.status_code in (200, 201)


def test_helper_note_for_unassigned_student(client, helper):
    """Helper cannot post notes for students not assigned to them."""
    r = client.post("/api/helper/notes", json={
        "student_id": USER_B,
        "message": "Unauthorized note.",
    }, headers=_helper_headers())
    assert r.status_code == 403


def test_helper_notes_invalid_token(client):
    r = client.post("/api/helper/notes", json={
        "student_id": USER_A, "message": "Try hack",
    }, headers={"X-Helper-Token": "invalid"})
    assert r.status_code == 401


def test_helper_note_empty_message(client, helper):
    r = client.post("/api/helper/notes", json={
        "student_id": USER_A, "message": "",
    }, headers=_helper_headers())
    assert r.status_code == 422
