"""
tests/test_auth.py
==================
Tests for:
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/me
"""
import pytest
from conftest import USER_A, make_token, auth_headers

# ── Register ──────────────────────────────────────────────────────────────────

def test_register_success(client):
    r = client.post("/api/auth/register", json={
        "email": "new@test.com",
        "password": "secret123",
        "name": "New User",
        "standard": "Class 10",
        "board": "CBSE",
        "language": "English",
    })
    assert r.status_code == 201
    data = r.json()
    assert "token" in data
    assert data["profile"]["email"] == "new@test.com"
    assert data["profile"]["name"] == "New User"
    assert "password_hash" not in data["profile"]


def test_register_duplicate_email(client):
    payload = {"email": "dup@test.com", "password": "secret123", "name": "Dup"}
    client.post("/api/auth/register", json=payload)
    r = client.post("/api/auth/register", json=payload)
    assert r.status_code == 409


def test_register_short_password(client):
    r = client.post("/api/auth/register", json={
        "email": "short@test.com", "password": "abc", "name": "Short",
    })
    assert r.status_code == 422


def test_register_invalid_email(client):
    r = client.post("/api/auth/register", json={
        "email": "not-an-email", "password": "secret123", "name": "Bad Email",
    })
    assert r.status_code == 422


def test_register_missing_name(client):
    r = client.post("/api/auth/register", json={
        "email": "noname@test.com", "password": "secret123", "name": "  ",
    })
    assert r.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_success(client, db):
    # First register so we have a hashed password
    client.post("/api/auth/register", json={
        "email": "login@test.com", "password": "correctpwd", "name": "Login User",
    })
    r = client.post("/api/auth/login", json={
        "email": "login@test.com", "password": "correctpwd",
    })
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert data["profile"]["email"] == "login@test.com"


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "email": "wrongpwd@test.com", "password": "correctpwd", "name": "Pwd Test",
    })
    r = client.post("/api/auth/login", json={
        "email": "wrongpwd@test.com", "password": "wrongpwd",
    })
    assert r.status_code == 401


def test_login_nonexistent_user(client):
    r = client.post("/api/auth/login", json={
        "email": "nobody@test.com", "password": "anything",
    })
    assert r.status_code == 401


def test_login_case_insensitive_email(client):
    client.post("/api/auth/register", json={
        "email": "case@test.com", "password": "secret123", "name": "Case",
    })
    r = client.post("/api/auth/login", json={
        "email": "CASE@TEST.COM", "password": "secret123",
    })
    assert r.status_code == 200


# ── Me ────────────────────────────────────────────────────────────────────────

def test_me_success(client, db):
    # Register first to get a proper hashed user
    reg = client.post("/api/auth/register", json={
        "email": "me@test.com", "password": "secret123", "name": "Me User",
    })
    token = reg.json()["token"]
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "me@test.com"


def test_me_no_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_bad_token(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer bad.token.here"})
    assert r.status_code == 401
