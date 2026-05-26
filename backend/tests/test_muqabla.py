"""
tests/test_muqabla.py
=====================
Tests for Muqabla (Battle Arena):
  POST  /api/muqabla/challenge
  GET   /api/muqabla/battles/{id}
  POST  /api/muqabla/battles/{id}/join
  POST  /api/muqabla/battles/{id}/answer
  GET   /api/muqabla/open
  GET   /api/muqabla/pending
  GET   /api/muqabla/active
  GET   /api/muqabla/history
  GET   /api/muqabla/leaderboard
  GET   /api/muqabla/leaderboard/school
"""
import pytest
from conftest import USER_A, USER_B, auth_headers

# ── Helpers ───────────────────────────────────────────────────────────────────

def _challenge(client, user_id=USER_A, subject="Math"):
    r = client.post("/api/muqabla/challenge", json={
        "subject": subject,
        "standard": "Class 10",
    }, headers=auth_headers(user_id))
    assert r.status_code in (200, 201), r.text
    return r.json()


# ═══════════════════════════════════════════════════════════════════════════════
#  Challenge / Battle lifecycle
# ═══════════════════════════════════════════════════════════════════════════════

def test_create_challenge(client):
    battle = _challenge(client)
    assert "id" in battle
    assert battle["status"] == "open"
    assert battle["challenger_id"] == USER_A


def test_get_battle_by_id(client):
    battle = _challenge(client)
    r = client.get(f"/api/muqabla/battles/{battle['id']}", headers=auth_headers(USER_A))
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == battle["id"]


def test_get_battle_not_found(client):
    r = client.get("/api/muqabla/battles/999999", headers=auth_headers(USER_A))
    assert r.status_code == 404


def test_join_battle(client):
    battle = _challenge(client, USER_A)
    r = client.post(f"/api/muqabla/battles/{battle['id']}/join",
                    headers=auth_headers(USER_B))
    assert r.status_code == 200
    data = r.json()
    assert data["opponent_id"] == USER_B
    assert data["status"] in ("active", "answered")


def test_join_own_battle_forbidden(client):
    battle = _challenge(client, USER_A)
    r = client.post(f"/api/muqabla/battles/{battle['id']}/join",
                    headers=auth_headers(USER_A))
    assert r.status_code == 400


def test_answer_battle(client):
    battle = _challenge(client, USER_A)
    client.post(f"/api/muqabla/battles/{battle['id']}/join",
                headers=auth_headers(USER_B))
    r = client.post(f"/api/muqabla/battles/{battle['id']}/answer",
                    json={"answers": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]},
                    headers=auth_headers(USER_A))
    assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
#  Battle lists
# ═══════════════════════════════════════════════════════════════════════════════

def test_open_battles_empty(client):
    r = client.get("/api/muqabla/open", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_open_battles_with_data(client):
    _challenge(client, USER_A)
    r = client.get("/api/muqabla/open", headers=auth_headers(USER_B))
    assert r.status_code == 200
    battles = r.json()
    assert len(battles) >= 1


def test_pending_battles_empty(client):
    r = client.get("/api/muqabla/pending", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_active_battles_empty(client):
    r = client.get("/api/muqabla/active", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_history_empty(client):
    r = client.get("/api/muqabla/history", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_battle_list_requires_auth(client):
    r = client.get("/api/muqabla/open")
    assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
#  Leaderboard
# ═══════════════════════════════════════════════════════════════════════════════

def test_leaderboard(client):
    r = client.get("/api/muqabla/leaderboard", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_leaderboard_school(client):
    r = client.get("/api/muqabla/school-leaderboard", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_leaderboard_requires_auth(client):
    r = client.get("/api/muqabla/leaderboard")
    assert r.status_code == 401
