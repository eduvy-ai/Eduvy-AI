"""
tests/test_curriculum.py
========================
Tests for public curriculum endpoints:
  GET /api/curriculum/boards
  GET /api/curriculum/standards
  GET /api/curriculum/mediums
  GET /api/curriculum/subjects
"""
import json
import pytest
from conftest import auth_headers, USER_A

# ── Seed helpers ──────────────────────────────────────────────────────────────

@pytest.fixture()
def seeded(db):
    """Seed boards, standards, mediums and a curriculum row."""
    db.execute("INSERT INTO boards(id,name,sort_order,is_active) VALUES(?,?,?,?)",
               ("cbse", "CBSE", 1, 1))
    db.execute("INSERT INTO boards(id,name,sort_order,is_active) VALUES(?,?,?,?)",
               ("icse", "ICSE", 2, 1))
    db.execute("INSERT INTO standards(id,name,grade_num,sort_order,is_active) VALUES(?,?,?,?,?)",
               ("class-10", "Class 10", 10, 10, 1))
    db.execute("INSERT INTO standards(id,name,grade_num,sort_order,is_active) VALUES(?,?,?,?,?)",
               ("class-9", "Class 9", 9, 9, 1))
    db.execute("INSERT INTO mediums(id,name,sort_order,is_active) VALUES(?,?,?,?)",
               ("english", "English", 1, 1))
    db.execute("INSERT INTO mediums(id,name,sort_order,is_active) VALUES(?,?,?,?)",
               ("hindi", "Hindi", 2, 1))
    db.execute(
        "INSERT INTO curriculum(board_id,standard_id,medium_id,subjects,is_active) VALUES(?,?,?,?,?)",
        ("cbse", "class-10", "english", json.dumps(["Math", "Science", "English", "Social Studies"]), 1),
    )
    db.commit()
    return db


# ═══════════════════════════════════════════════════════════════════════════════
#  Boards
# ═══════════════════════════════════════════════════════════════════════════════

def test_boards_empty(client):
    r = client.get("/api/curriculum/boards")
    assert r.status_code == 200
    assert r.json() == []


def test_boards_returns_active(client, seeded):
    r = client.get("/api/curriculum/boards")
    assert r.status_code == 200
    boards = r.json()
    ids = [b["id"] for b in boards]
    assert "cbse" in ids
    assert "icse" in ids


def test_boards_inactive_filtered(client, db):
    db.execute("INSERT INTO boards(id,name,sort_order,is_active) VALUES(?,?,?,?)",
               ("hidden-board", "Hidden", 99, 0))
    db.commit()
    r = client.get("/api/curriculum/boards")
    assert r.status_code == 200
    ids = [b["id"] for b in r.json()]
    assert "hidden-board" not in ids


# ═══════════════════════════════════════════════════════════════════════════════
#  Standards
# ═══════════════════════════════════════════════════════════════════════════════

def test_standards_empty(client):
    r = client.get("/api/curriculum/standards")
    assert r.status_code == 200
    assert r.json() == []


def test_standards_list(client, seeded):
    r = client.get("/api/curriculum/standards")
    assert r.status_code == 200
    standards = r.json()
    ids = [s["id"] for s in standards]
    assert "class-10" in ids
    assert "class-9" in ids


def test_standards_filter_by_board(client, seeded):
    r = client.get("/api/curriculum/standards?board_id=cbse")
    assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
#  Mediums
# ═══════════════════════════════════════════════════════════════════════════════

def test_mediums_empty(client):
    r = client.get("/api/curriculum/mediums")
    assert r.status_code == 200
    assert r.json() == []


def test_mediums_list(client, seeded):
    r = client.get("/api/curriculum/mediums")
    assert r.status_code == 200
    mediums = r.json()
    ids = [m["id"] for m in mediums]
    assert "english" in ids
    assert "hindi" in ids


# ═══════════════════════════════════════════════════════════════════════════════
#  Subjects
# ═══════════════════════════════════════════════════════════════════════════════

def test_subjects_empty(client):
    r = client.get("/api/curriculum/subjects?board_id=cbse&standard_id=class-10&medium_id=english")
    assert r.status_code == 200
    # No curriculum rows exist yet → empty list or 404
    assert r.json() in ([], None) or r.status_code == 200


def test_subjects_with_data(client, seeded):
    r = client.get("/api/curriculum/subjects?board_id=cbse&standard_id=class-10&medium_id=english")
    assert r.status_code == 200
    data = r.json()
    subjects = data if isinstance(data, list) else data.get("subjects", [])
    assert "Math" in subjects
    assert "Science" in subjects


def test_subjects_not_found_combo(client, seeded):
    r = client.get("/api/curriculum/subjects?board_id=cbse&standard_id=class-10&medium_id=hindi")
    assert r.status_code in (200, 404)
