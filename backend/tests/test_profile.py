"""
tests/test_profile.py
=====================
Tests for:
  POST   /api/profile
  GET    /api/profile/{user_id}
  PUT    /api/profile/{user_id}
  POST   /api/profile/{user_id}/xp
  PUT    /api/profile/{user_id}/streak
  GET    /api/mastery/{user_id}
  PUT    /api/mastery/{user_id}
  POST   /api/quiz/{user_id}/result
  GET    /api/quiz/{user_id}/stats
"""
import pytest
from conftest import USER_A, USER_B, auth_headers

# ── POST /api/profile ─────────────────────────────────────────────────────────

def test_create_profile_success(client):
    r = client.post("/api/profile", json={
        "id": "new-profile-id",
        "name": "New Student",
        "standard": "Class 9",
        "board": "ICSE",
        "language": "English",
        "subjects": ["Math", "Science"],
    })
    assert r.status_code == 201
    data = r.json()
    assert data["id"] == "new-profile-id"
    assert data["name"] == "New Student"
    assert "password_hash" not in data


def test_create_profile_conflict(client):
    # USER_A is already seeded by conftest
    r = client.post("/api/profile", json={
        "id": USER_A, "name": "Duplicate", "standard": "Class 10",
        "board": "CBSE", "language": "English",
    })
    assert r.status_code == 409


# ── GET /api/profile/{user_id} ────────────────────────────────────────────────

def test_get_profile_success(client):
    r = client.get(f"/api/profile/{USER_A}", headers=auth_headers(USER_A))
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == USER_A
    assert data["name"] == "Aarav"
    assert "password_hash" not in data


def test_get_profile_not_found(client):
    r = client.get("/api/profile/no-such-user", headers=auth_headers(USER_A))
    assert r.status_code == 404


def test_get_profile_no_auth(client):
    r = client.get(f"/api/profile/{USER_A}")
    assert r.status_code == 401


# ── PUT /api/profile/{user_id} ────────────────────────────────────────────────

def test_update_profile_success(client):
    r = client.put(
        f"/api/profile/{USER_A}",
        json={"name": "Aarav Updated", "standard": "Class 11", "school": "Delhi Public School"},
        headers=auth_headers(USER_A),
    )
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Aarav Updated"
    assert data["standard"] == "Class 11"
    assert data["school"] == "Delhi Public School"


def test_update_profile_forbidden(client):
    r = client.put(
        f"/api/profile/{USER_A}",
        json={"name": "Hacker"},
        headers=auth_headers(USER_B),
    )
    assert r.status_code == 403


# ── POST /api/profile/{user_id}/xp ───────────────────────────────────────────

def test_add_xp_success(client, db):
    r = client.post(
        f"/api/profile/{USER_A}/xp",
        json={"points": 50},
        headers=auth_headers(USER_A),
    )
    assert r.status_code == 200
    data = r.json()
    assert data["xp"] >= 50


def test_add_xp_forbidden(client):
    r = client.post(
        f"/api/profile/{USER_A}/xp",
        json={"points": 100},
        headers=auth_headers(USER_B),
    )
    assert r.status_code == 403


# ── PUT /api/profile/{user_id}/streak ────────────────────────────────────────

def test_update_streak_success(client):
    r = client.put(
        f"/api/profile/{USER_A}/streak",
        json={"streak": 7},
        headers=auth_headers(USER_A),
    )
    assert r.status_code == 200
    assert r.json()["streak"] == 7


def test_update_streak_forbidden(client):
    r = client.put(
        f"/api/profile/{USER_A}/streak",
        json={"streak": 99},
        headers=auth_headers(USER_B),
    )
    assert r.status_code == 403


# ── GET /api/mastery/{user_id} ────────────────────────────────────────────────

def test_get_mastery_empty(client):
    r = client.get(f"/api/mastery/{USER_A}", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json() == []


def test_get_mastery_with_data(client, db):
    db.execute(
        "INSERT INTO mastery(user_id, subject, score) VALUES(?,?,?)",
        (USER_A, "Mathematics", 75),
    )
    db.commit()
    r = client.get(f"/api/mastery/{USER_A}", headers=auth_headers(USER_A))
    assert r.status_code == 200
    data = r.json()
    assert any(m["subject"] == "Mathematics" and m["score"] == 75 for m in data)


# ── PUT /api/mastery/{user_id} ────────────────────────────────────────────────

def test_update_mastery_success(client):
    r = client.put(
        f"/api/mastery/{USER_A}",
        json={"subject": "Physics", "score": 80},
        headers=auth_headers(USER_A),
    )
    assert r.status_code == 200
    assert r.json()["score"] == 80


def test_update_mastery_upsert(client, db):
    db.execute(
        "INSERT INTO mastery(user_id, subject, score) VALUES(?,?,?)",
        (USER_A, "Chemistry", 60),
    )
    db.commit()
    r = client.put(
        f"/api/mastery/{USER_A}",
        json={"subject": "Chemistry", "score": 90},
        headers=auth_headers(USER_A),
    )
    assert r.status_code == 200
    assert r.json()["score"] == 90


# ── POST /api/quiz/{user_id}/result ──────────────────────────────────────────

def test_save_quiz_result(client):
    r = client.post(
        f"/api/quiz/{USER_A}/result",
        json={"subject": "Math", "difficulty": "Hard", "correct": 8, "total": 10},
        headers=auth_headers(USER_A),
    )
    assert r.status_code == 201


def test_save_quiz_result_forbidden(client):
    r = client.post(
        f"/api/quiz/{USER_A}/result",
        json={"subject": "Math", "difficulty": "Easy", "correct": 5, "total": 10},
        headers=auth_headers(USER_B),
    )
    assert r.status_code == 403


# ── GET /api/quiz/{user_id}/stats ─────────────────────────────────────────────

def test_get_quiz_stats_empty(client):
    r = client.get(f"/api/quiz/{USER_A}/stats", headers=auth_headers(USER_A))
    assert r.status_code == 200


def test_get_quiz_stats_with_data(client, db):
    db.execute(
        "INSERT INTO quiz_results(user_id,subject,difficulty,correct,total) VALUES(?,?,?,?,?)",
        (USER_A, "Biology", "Medium", 7, 10),
    )
    db.commit()
    r = client.get(f"/api/quiz/{USER_A}/stats", headers=auth_headers(USER_A))
    assert r.status_code == 200


def test_get_quiz_stats_forbidden(client):
    r = client.get(f"/api/quiz/{USER_A}/stats", headers=auth_headers(USER_B))
    assert r.status_code == 403
