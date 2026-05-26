"""
tests/test_bhool.py
===================
Tests for Bhool Bazaar:
  POST   /api/bhool/cards
  GET    /api/bhool/cards/mine
  PUT    /api/bhool/cards/{id}
  DELETE /api/bhool/cards/{id}
  GET    /api/bhool/marketplace
  GET    /api/bhool/marketplace/top
  POST   /api/bhool/cards/{id}/collect
  POST   /api/bhool/cards/{id}/react
  GET    /api/bhool/collections
"""
import pytest
from conftest import USER_A, USER_B, auth_headers

# ── Helpers ───────────────────────────────────────────────────────────────────

def _create_card(client, user_id=USER_A, subject="Math", published=False):
    r = client.post("/api/bhool/cards", json={
        "subject": subject,
        "standard": "Class 10",
        "question": "What is the formula for area of a circle?",
        "wrong_answer": "2πr",
        "correct_answer": "πr²",
        "why_wrong": "Confused with circumference",
        "is_published": published,
    }, headers=auth_headers(user_id))
    assert r.status_code in (200, 201), r.text
    return r.json()


# ── Card CRUD ─────────────────────────────────────────────────────────────────

def test_create_card_success(client):
    card = _create_card(client)
    assert "id" in card
    assert card["subject"] == "Math"
    assert card["user_id"] == USER_A


def test_get_my_cards_empty(client):
    r = client.get("/api/bhool/cards/mine", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json() == []


def test_get_my_cards_with_data(client):
    _create_card(client)
    r = client.get("/api/bhool/cards/mine", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_update_card_success(client):
    card = _create_card(client)
    r = client.put(f"/api/bhool/cards/{card['id']}", json={
        "question": "Updated question?",
        "wrong_answer": "Still wrong",
        "correct_answer": "πr²",
        "why_wrong": "Updated reason",
        "is_published": True,
    }, headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json()["question"] == "Updated question?"


def test_update_card_forbidden(client):
    card = _create_card(client, USER_A)
    r = client.put(f"/api/bhool/cards/{card['id']}", json={
        "question": "Hacked question?",
        "wrong_answer": "wrong",
        "correct_answer": "right",
        "why_wrong": "test",
        "is_published": False,
    }, headers=auth_headers(USER_B))
    assert r.status_code == 403


def test_delete_card_success(client):
    card = _create_card(client)
    r = client.delete(f"/api/bhool/cards/{card['id']}", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_delete_card_not_owner(client):
    card = _create_card(client, USER_A)
    r = client.delete(f"/api/bhool/cards/{card['id']}", headers=auth_headers(USER_B))
    assert r.status_code == 403


def test_card_requires_auth(client):
    r = client.get("/api/bhool/cards/mine")
    assert r.status_code == 401


# ── Marketplace ───────────────────────────────────────────────────────────────

def test_marketplace_empty(client):
    r = client.get("/api/bhool/marketplace", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json() == []


def test_marketplace_shows_published(client):
    _create_card(client, USER_A, published=True)
    r = client.get("/api/bhool/marketplace", headers=auth_headers(USER_B))
    assert r.status_code == 200
    cards = r.json()
    assert len(cards) >= 1
    assert all(c.get("is_published") in (True, 1) for c in cards)


def test_marketplace_filter_subject(client):
    _create_card(client, USER_A, subject="Physics", published=True)
    r = client.get("/api/bhool/marketplace?subject=Physics", headers=auth_headers(USER_B))
    assert r.status_code == 200
    cards = r.json()
    assert all(c["subject"] == "Physics" for c in cards)


def test_marketplace_top(client):
    _create_card(client, USER_A, published=True)
    r = client.get("/api/bhool/marketplace/top", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ── Collect ───────────────────────────────────────────────────────────────────

def test_collect_card(client):
    card = _create_card(client, USER_A, published=True)
    r = client.post(f"/api/bhool/cards/{card['id']}/collect", headers=auth_headers(USER_B))
    assert r.status_code == 200


def test_collect_card_idempotent(client):
    card = _create_card(client, USER_A, published=True)
    client.post(f"/api/bhool/cards/{card['id']}/collect", headers=auth_headers(USER_B))
    r = client.post(f"/api/bhool/cards/{card['id']}/collect", headers=auth_headers(USER_B))
    assert r.status_code == 200


def test_get_collections_empty(client):
    r = client.get("/api/bhool/collections", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json() == []


def test_get_collections_with_data(client):
    card = _create_card(client, USER_A, published=True)
    client.post(f"/api/bhool/cards/{card['id']}/collect", headers=auth_headers(USER_B))
    r = client.get("/api/bhool/collections", headers=auth_headers(USER_B))
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ── React ─────────────────────────────────────────────────────────────────────

def test_react_to_card(client):
    card = _create_card(client, USER_A, published=True)
    r = client.post(f"/api/bhool/cards/{card['id']}/react", json={"emoji": "🔥"},
                    headers=auth_headers(USER_B))
    assert r.status_code == 200


def test_react_requires_auth(client):
    card = _create_card(client, USER_A, published=True)
    r = client.post(f"/api/bhool/cards/{card['id']}/react", json={"emoji": "😅"})
    assert r.status_code == 401
