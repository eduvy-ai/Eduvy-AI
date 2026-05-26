"""
tests/test_notebook.py
======================
Tests for NotebookLM feature:
  POST   /api/notebook/{user_id}/sources
  GET    /api/notebook/{user_id}/sources
  DELETE /api/notebook/{user_id}/sources/{source_id}
  GET    /api/notebook/{user_id}/chat
  POST   /api/notebook/{user_id}/chat
  DELETE /api/notebook/{user_id}/chat
  GET    /api/notebook/{user_id}/studio
  POST   /api/notebook/{user_id}/studio
"""
import pytest
from conftest import USER_A, USER_B, auth_headers

# ── Sources ───────────────────────────────────────────────────────────────────

def test_add_source(client):
    r = client.post(f"/api/notebook/{USER_A}/sources", json={
        "id": "src-001",
        "name": "Chapter 1 Notes",
        "type": "text",
        "content": "Photosynthesis is the process by which plants make food...",
        "icon": "📄",
    }, headers=auth_headers(USER_A))
    assert r.status_code in (200, 201)


def test_list_sources_empty(client):
    r = client.get(f"/api/notebook/{USER_A}/sources", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json() == []


def test_list_sources_with_data(client):
    client.post(f"/api/notebook/{USER_A}/sources", json={
        "id": "src-002",
        "name": "Test Source",
        "type": "text",
        "content": "Some content here",
        "icon": "📖",
    }, headers=auth_headers(USER_A))
    r = client.get(f"/api/notebook/{USER_A}/sources", headers=auth_headers(USER_A))
    assert r.status_code == 200
    sources = r.json()
    assert len(sources) == 1
    assert sources[0]["id"] == "src-002"


def test_delete_source(client):
    client.post(f"/api/notebook/{USER_A}/sources", json={
        "id": "del-src", "name": "Delete Me", "type": "text",
        "content": "to delete", "icon": "📝",
    }, headers=auth_headers(USER_A))
    r = client.delete(f"/api/notebook/{USER_A}/sources/del-src",
                      headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_delete_source_not_found(client):
    r = client.delete(f"/api/notebook/{USER_A}/sources/no-such-src",
                      headers=auth_headers(USER_A))
    assert r.status_code == 404


def test_sources_require_auth(client):
    r = client.get(f"/api/notebook/{USER_A}/sources")
    assert r.status_code == 401


def test_source_isolation(client):
    """USER_B cannot list USER_A's sources (ownership check)."""
    r = client.get(f"/api/notebook/{USER_A}/sources", headers=auth_headers(USER_B))
    assert r.status_code == 403


# ── Chat ──────────────────────────────────────────────────────────────────────

def test_get_chat_empty(client):
    r = client.get(f"/api/notebook/{USER_A}/chat", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json() == []


def test_add_chat_message(client):
    r = client.post(f"/api/notebook/{USER_A}/chat", json={
        "role": "user",
        "content": "What is mitosis?",
    }, headers=auth_headers(USER_A))
    assert r.status_code in (200, 201)


def test_get_chat_messages(client):
    client.post(f"/api/notebook/{USER_A}/chat", json={
        "role": "user", "content": "Explain photosynthesis.",
    }, headers=auth_headers(USER_A))
    client.post(f"/api/notebook/{USER_A}/chat", json={
        "role": "assistant", "content": "Photosynthesis is the process...",
    }, headers=auth_headers(USER_A))
    r = client.get(f"/api/notebook/{USER_A}/chat", headers=auth_headers(USER_A))
    assert r.status_code == 200
    messages = r.json()
    assert len(messages) == 2


def test_delete_chat(client):
    client.post(f"/api/notebook/{USER_A}/chat", json={
        "role": "user", "content": "Clear this.",
    }, headers=auth_headers(USER_A))
    r = client.delete(f"/api/notebook/{USER_A}/chat", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json()["ok"] is True
    # Verify cleared
    r2 = client.get(f"/api/notebook/{USER_A}/chat", headers=auth_headers(USER_A))
    assert r2.json() == []


def test_chat_isolation(client):
    r = client.post(f"/api/notebook/{USER_A}/chat", json={
        "role": "user", "content": "Hack this.",
    }, headers=auth_headers(USER_B))
    assert r.status_code == 403


# ── Studio ────────────────────────────────────────────────────────────────────

def test_get_studio_empty(client):
    r = client.get(f"/api/notebook/{USER_A}/studio", headers=auth_headers(USER_A))
    assert r.status_code == 200
    assert r.json() == []


def test_save_studio_output(client):
    r = client.post(f"/api/notebook/{USER_A}/studio", json={
        "type": "podcast",
        "output_json": {"script": "Welcome to today's episode..."},
    }, headers=auth_headers(USER_A))
    assert r.status_code in (200, 201)


def test_get_studio_with_data(client):
    client.post(f"/api/notebook/{USER_A}/studio", json={
        "type": "quiz", "output_json": {"questions": []},
    }, headers=auth_headers(USER_A))
    r = client.get(f"/api/notebook/{USER_A}/studio", headers=auth_headers(USER_A))
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert items[0]["type"] == "quiz"


def test_studio_requires_auth(client):
    r = client.get(f"/api/notebook/{USER_A}/studio")
    assert r.status_code == 401
