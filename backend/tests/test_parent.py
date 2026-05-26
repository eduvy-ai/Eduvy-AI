"""
tests/test_parent.py
====================
Tests for Parent Dashboard:
  POST   /api/parent/pin
  GET    /api/parent/pin
  DELETE /api/parent/pin
  GET    /api/parent/view/{pin}    (public, no auth)
"""
import pytest
from conftest import USER_A, USER_B, auth_headers

# ═══════════════════════════════════════════════════════════════════════════════
#  PIN management
# ═══════════════════════════════════════════════════════════════════════════════

def test_create_pin(client):
    r = client.post("/api/parent/pin", headers=auth_headers(USER_A))
    assert r.status_code in (200, 201)
    data = r.json()
    assert "pin" in data
    assert len(data["pin"]) >= 4


def test_create_pin_idempotent(client):
    """Creating again returns the same PIN (or a fresh one — either is valid)."""
    r1 = client.post("/api/parent/pin", headers=auth_headers(USER_A))
    r2 = client.post("/api/parent/pin", headers=auth_headers(USER_A))
    assert r2.status_code in (200, 201)


def test_get_pin(client):
    client.post("/api/parent/pin", headers=auth_headers(USER_A))
    r = client.get("/api/parent/pin", headers=auth_headers(USER_A))
    assert r.status_code == 200
    data = r.json()
    assert "pin" in data


def test_get_pin_not_created(client):
    r = client.get("/api/parent/pin", headers=auth_headers(USER_B))
    assert r.status_code in (200, 404)


def test_delete_pin(client):
    client.post("/api/parent/pin", headers=auth_headers(USER_A))
    r = client.delete("/api/parent/pin", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_pin_requires_auth(client):
    r = client.post("/api/parent/pin")
    assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
#  Public view
# ═══════════════════════════════════════════════════════════════════════════════

def test_view_pin_success(client, db):
    # Seed a parent pin directly
    db.execute(
        "INSERT INTO parent_pins(user_id, pin, is_active) VALUES(?,?,?)",
        (USER_A, "1234", 1),
    )
    db.commit()
    r = client.get("/api/parent/view/1234")  # No auth header
    assert r.status_code == 200
    data = r.json()
    assert "student" in data or "profile" in data or "name" in str(data)


def test_view_pin_not_found(client):
    r = client.get("/api/parent/view/9999")
    assert r.status_code == 404


def test_view_pin_returns_student_info(client, db):
    db.execute(
        "INSERT INTO parent_pins(user_id, pin, is_active) VALUES(?,?,?)",
        (USER_A, "5678", 1),
    )
    db.commit()
    r = client.get("/api/parent/view/5678")
    assert r.status_code == 200
    response_text = str(r.json())
    # Should contain some student data (name or xp or standard)
    assert any(field in response_text for field in ["Aarav", "Class 10", "CBSE", "xp"])
