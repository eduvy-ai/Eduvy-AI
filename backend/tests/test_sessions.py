"""
tests/test_sessions.py
======================
Tests for:
  GET    /api/sessions/{user_id}/{session_id}
  POST   /api/sessions/{user_id}/{session_id}
  DELETE /api/sessions/{user_id}/{session_id}
  GET    /api/drafts/{user_id}/{draft_key}
  PUT    /api/drafts/{user_id}/{draft_key}
  GET    /api/referrals/{user_id}/code
  POST   /api/referrals/{user_id}/apply
"""
import pytest
from conftest import USER_A, USER_B, auth_headers

SESSION_ID = "tutor-session"

# ═══════════════════════════════════════════════════════════════════════════════
#  Chat sessions
# ═══════════════════════════════════════════════════════════════════════════════

def test_get_session_empty(client):
    r = client.get(f"/api/chat-session/{USER_A}/{SESSION_ID}",
                   headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json() == []


def test_save_session_message(client):
    r = client.post(
        f"/api/chat-session/{USER_A}/{SESSION_ID}",
        json={"role": "user", "content": "Hello Sathi!"},
        headers=auth_headers(USER_A),
    )
    assert r.status_code in (200, 201)


def test_get_session_messages(client):
    client.post(
        f"/api/chat-session/{USER_A}/{SESSION_ID}",
        json={"role": "user", "content": "What is Newton's first law?"},
        headers=auth_headers(USER_A),
    )
    client.post(
        f"/api/chat-session/{USER_A}/{SESSION_ID}",
        json={"role": "assistant", "content": "An object remains at rest..."},
        headers=auth_headers(USER_A),
    )
    r = client.get(f"/api/chat-session/{USER_A}/{SESSION_ID}",
                   headers=auth_headers(USER_A))
    assert r.status_code == 200
    messages = r.json()
    assert len(messages) == 2
    assert messages[0]["role"] == "user"


def test_delete_session(client):
    client.post(
        f"/api/chat-session/{USER_A}/{SESSION_ID}",
        json={"role": "user", "content": "Clear this."},
        headers=auth_headers(USER_A),
    )
    r = client.delete(f"/api/chat-session/{USER_A}/{SESSION_ID}",
                      headers=auth_headers(USER_A))
    assert r.status_code == 200
    r2 = client.get(f"/api/chat-session/{USER_A}/{SESSION_ID}",
                    headers=auth_headers(USER_A))
    assert r2.json() == []


def test_session_isolation(client):
    r = client.get(f"/api/chat-session/{USER_A}/{SESSION_ID}",
                   headers=auth_headers(USER_B))
    assert r.status_code == 403


def test_session_requires_auth(client):
    r = client.get(f"/api/chat-session/{USER_A}/{SESSION_ID}")
    assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
#  Drafts
# ═══════════════════════════════════════════════════════════════════════════════

DRAFT_KEY = "essay-draft"

def test_get_draft_nonexistent(client):
    r = client.get(f"/api/draft/{USER_A}/{DRAFT_KEY}",
                   headers=auth_headers(USER_A))
    assert r.status_code == 200
    # Should return null or empty object, not 404
    data = r.json()
    assert data is None or data == {} or data.get("content") in (None, "")


def test_save_draft(client):
    r = client.put(
        f"/api/draft/{USER_A}/{DRAFT_KEY}",
        json={"content": "My essay draft content...", "extra": "{}"},
        headers=auth_headers(USER_A),
    )
    assert r.status_code == 200


def test_get_saved_draft(client):
    client.put(
        f"/api/draft/{USER_A}/{DRAFT_KEY}",
        json={"content": "Draft content here", "extra": "{}"},
        headers=auth_headers(USER_A),
    )
    r = client.get(f"/api/draft/{USER_A}/{DRAFT_KEY}",
                   headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert "Draft content here" in str(r.json())


def test_draft_upsert(client):
    """Saving twice should upsert, not create duplicate."""
    client.put(
        f"/api/draft/{USER_A}/{DRAFT_KEY}",
        json={"content": "First version", "extra": "{}"},
        headers=auth_headers(USER_A),
    )
    client.put(
        f"/api/draft/{USER_A}/{DRAFT_KEY}",
        json={"content": "Second version", "extra": "{}"},
        headers=auth_headers(USER_A),
    )
    r = client.get(f"/api/draft/{USER_A}/{DRAFT_KEY}",
                   headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert "Second version" in str(r.json())


def test_draft_isolation(client):
    r = client.get(f"/api/draft/{USER_A}/{DRAFT_KEY}",
                   headers=auth_headers(USER_B))
    assert r.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
#  Referrals
# ═══════════════════════════════════════════════════════════════════════════════

def test_get_referral_code(client):
    r = client.get("/api/referrals/code", headers=auth_headers(USER_A))
    assert r.status_code == 200
    data = r.json()
    assert "code" in data
    assert len(data["code"]) >= 4


def test_get_referral_code_idempotent(client):
    r1 = client.get("/api/referrals/code", headers=auth_headers(USER_A))
    r2 = client.get("/api/referrals/code", headers=auth_headers(USER_A))
    assert r1.json()["code"] == r2.json()["code"]


def test_apply_referral_code(client, db):
    # Seed a referral code on USER_A
    db.execute(
        "UPDATE users SET referral_code=? WHERE id=?",
        ("TESTCODE123", USER_A),
    )
    db.commit()
    r = client.post(
        "/api/referrals/apply",
        json={"code": "TESTCODE123"},
        headers=auth_headers(USER_B),
    )
    assert r.status_code == 200


def test_apply_nonexistent_referral_code(client):
    r = client.post(
        "/api/referrals/apply",
        json={"code": "NOSUCHCODE"},
        headers=auth_headers(USER_B),
    )
    assert r.status_code == 404


def test_referral_requires_auth(client):
    r = client.get("/api/referrals/code")
    assert r.status_code == 401
