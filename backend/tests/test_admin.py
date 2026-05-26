"""
tests/test_admin.py
===================
Tests for all /api/admin/* routes:
  POST  /api/admin/setup
  POST  /api/admin/login
  GET   /api/admin/me
  GET/POST/PUT/DELETE  /api/admin/boards          (+ /import)
  GET/POST/PUT/DELETE  /api/admin/standards       (+ /import)
  GET/POST/PUT/DELETE  /api/admin/mediums         (+ /import)
  GET/POST/PUT/DELETE  /api/admin/curriculum      (+ /import)
  GET   /api/admin/users
  PUT   /api/admin/users/{id}/plan
  PUT   /api/admin/users/{id}/drishti
  PUT   /api/admin/users/{id}/ai-config
  POST  /api/admin/users/drishti
  GET   /api/admin/usage/summary
  GET   /api/admin/usage/users
  GET   /api/admin/ai-config
  PUT   /api/admin/ai-config
  PUT   /api/admin/ai-keys
  DELETE /api/admin/ai-keys/{provider}/{slot}
  GET/POST/PUT/DELETE  /api/admin/drishti-helpers
  GET   /api/admin/drishti-helpers/{id}/students
  POST/DELETE /api/admin/drishti-helpers/{id}/assign/{student_id}
  GET   /api/admin/drishti-students
"""
import pytest
from conftest import admin_headers, USER_A, USER_B

# ── Setup admin once per test module ─────────────────────────────────────────

@pytest.fixture()
def admin(client, db):
    """Create the first admin user and return the bearer token."""
    r = client.post("/api/admin/setup", json={
        "email": "admin@test.com",
        "password": "adminpass1",
        "name": "Test Admin",
    })
    assert r.status_code == 201, r.text
    token = r.json()["token"]
    # Update ADMIN_ID reference in conftest-generated tokens isn't needed;
    # the setup response token references id=1 (first admin).
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════════════════════════════════════════
#  Auth
# ═══════════════════════════════════════════════════════════════════════════════

def test_admin_setup_success(client):
    r = client.post("/api/admin/setup", json={
        "email": "first@admin.com", "password": "strongpass1", "name": "First",
    })
    assert r.status_code == 201
    assert "token" in r.json()


def test_admin_setup_rejected_if_exists(client, admin):
    r = client.post("/api/admin/setup", json={
        "email": "second@admin.com", "password": "strongpass1", "name": "Second",
    })
    assert r.status_code == 403


def test_admin_login_success(client, admin):
    r = client.post("/api/admin/login", json={
        "email": "admin@test.com", "password": "adminpass1",
    })
    assert r.status_code == 200
    assert "token" in r.json()


def test_admin_login_wrong_password(client, admin):
    r = client.post("/api/admin/login", json={
        "email": "admin@test.com", "password": "wrongpass",
    })
    assert r.status_code == 401


def test_admin_me(client, admin):
    r = client.get("/api/admin/me", headers=admin)
    assert r.status_code == 200
    assert r.json()["email"] == "admin@test.com"


def test_admin_me_no_token(client):
    r = client.get("/api/admin/me")
    assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
#  Boards
# ═══════════════════════════════════════════════════════════════════════════════

def test_boards_list_empty(client, admin):
    r = client.get("/api/admin/boards", headers=admin)
    assert r.status_code == 200
    assert r.json() == []


def test_boards_create(client, admin):
    r = client.post("/api/admin/boards", json={
        "id": "cbse", "name": "CBSE", "sort_order": 1, "is_active": True,
    }, headers=admin)
    assert r.status_code == 201
    assert r.json()["id"] == "cbse"


def test_boards_update(client, admin):
    client.post("/api/admin/boards", json={
        "id": "icse", "name": "ICSE", "sort_order": 2, "is_active": True,
    }, headers=admin)
    r = client.put("/api/admin/boards/icse", json={
        "id": "icse", "name": "ICSE Board", "sort_order": 2, "is_active": True,
    }, headers=admin)
    assert r.status_code == 200
    assert r.json()["name"] == "ICSE Board"


def test_boards_delete(client, admin):
    client.post("/api/admin/boards", json={
        "id": "del-board", "name": "Del", "sort_order": 9, "is_active": True,
    }, headers=admin)
    r = client.delete("/api/admin/boards/del-board", headers=admin)
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_boards_import(client, admin):
    r = client.post("/api/admin/boards/import", json=[
        {"id": "ssc", "name": "SSC", "sort_order": 3, "is_active": True},
        {"id": "hsc", "name": "HSC", "sort_order": 4, "is_active": True},
    ], headers=admin)
    assert r.status_code == 200
    data = r.json()
    assert data["inserted"] == 2
    assert data["updated"] == 0


def test_boards_import_upsert(client, admin):
    # Create first
    client.post("/api/admin/boards/import", json=[
        {"id": "up-board", "name": "Old Name", "sort_order": 5, "is_active": True},
    ], headers=admin)
    # Import again → should update
    r = client.post("/api/admin/boards/import", json=[
        {"id": "up-board", "name": "New Name", "sort_order": 5, "is_active": True},
    ], headers=admin)
    assert r.status_code == 200
    data = r.json()
    assert data["updated"] == 1


# ═══════════════════════════════════════════════════════════════════════════════
#  Standards
# ═══════════════════════════════════════════════════════════════════════════════

def test_standards_list(client, admin):
    r = client.get("/api/admin/standards", headers=admin)
    assert r.status_code == 200


def test_standards_create(client, admin):
    r = client.post("/api/admin/standards", json={
        "id": "class-10", "name": "Class 10", "grade_num": 10,
        "sort_order": 10, "is_active": True,
    }, headers=admin)
    assert r.status_code == 201
    assert r.json()["id"] == "class-10"


def test_standards_update(client, admin):
    client.post("/api/admin/standards", json={
        "id": "class-9", "name": "Class 9", "grade_num": 9,
        "sort_order": 9, "is_active": True,
    }, headers=admin)
    r = client.put("/api/admin/standards/class-9", json={
        "id": "class-9", "name": "Class IX", "grade_num": 9,
        "sort_order": 9, "is_active": True,
    }, headers=admin)
    assert r.status_code == 200
    assert r.json()["name"] == "Class IX"


def test_standards_delete(client, admin):
    client.post("/api/admin/standards", json={
        "id": "del-std", "name": "Del Std", "grade_num": 1,
        "sort_order": 1, "is_active": True,
    }, headers=admin)
    r = client.delete("/api/admin/standards/del-std", headers=admin)
    assert r.status_code == 200


def test_standards_import(client, admin):
    r = client.post("/api/admin/standards/import", json=[
        {"id": "class-11", "name": "Class 11", "grade_num": 11, "sort_order": 11, "is_active": True},
        {"id": "class-12", "name": "Class 12", "grade_num": 12, "sort_order": 12, "is_active": True},
    ], headers=admin)
    assert r.status_code == 200
    assert r.json()["inserted"] == 2


# ═══════════════════════════════════════════════════════════════════════════════
#  Mediums
# ═══════════════════════════════════════════════════════════════════════════════

def test_mediums_create(client, admin):
    r = client.post("/api/admin/mediums", json={
        "id": "english", "name": "English Medium", "sort_order": 1, "is_active": True,
    }, headers=admin)
    assert r.status_code == 201
    assert r.json()["id"] == "english"


def test_mediums_update(client, admin):
    client.post("/api/admin/mediums", json={
        "id": "hindi", "name": "Hindi", "sort_order": 2, "is_active": True,
    }, headers=admin)
    r = client.put("/api/admin/mediums/hindi", json={
        "id": "hindi", "name": "Hindi Medium", "sort_order": 2, "is_active": True,
    }, headers=admin)
    assert r.status_code == 200
    assert r.json()["name"] == "Hindi Medium"


def test_mediums_import(client, admin):
    r = client.post("/api/admin/mediums/import", json=[
        {"id": "marathi", "name": "Marathi Medium", "sort_order": 3, "is_active": True},
    ], headers=admin)
    assert r.status_code == 200
    assert r.json()["inserted"] == 1


# ═══════════════════════════════════════════════════════════════════════════════
#  Curriculum
# ═══════════════════════════════════════════════════════════════════════════════

def _seed_curriculum_prereqs(client, admin):
    client.post("/api/admin/boards", json={"id": "cbse", "name": "CBSE", "sort_order": 1, "is_active": True}, headers=admin)
    client.post("/api/admin/standards", json={"id": "class-10", "name": "Class 10", "grade_num": 10, "sort_order": 10, "is_active": True}, headers=admin)
    client.post("/api/admin/mediums", json={"id": "english", "name": "English", "sort_order": 1, "is_active": True}, headers=admin)


def test_curriculum_create(client, admin):
    _seed_curriculum_prereqs(client, admin)
    r = client.post("/api/admin/curriculum", json={
        "board_id": "cbse", "standard_id": "class-10", "medium_id": "english",
        "subjects": ["Math", "Science", "English"], "is_active": True,
    }, headers=admin)
    assert r.status_code == 201
    assert r.json()["board_id"] == "cbse"


def test_curriculum_list(client, admin):
    r = client.get("/api/admin/curriculum", headers=admin)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_curriculum_update(client, admin, db):
    db.execute(
        "INSERT INTO curriculum(board_id, standard_id, medium_id, subjects, is_active) VALUES(?,?,?,?,?)",
        ("cbse", "class-10", "english", '["Math"]', 1),
    )
    db.commit()
    row_id = db.execute("SELECT id FROM curriculum WHERE board_id='cbse'").fetchone()[0]
    r = client.put(f"/api/admin/curriculum/{row_id}", json={
        "subjects": ["Math", "Science"],
    }, headers=admin)
    assert r.status_code == 200


def test_curriculum_delete(client, admin, db):
    db.execute(
        "INSERT INTO curriculum(board_id, standard_id, medium_id, subjects, is_active) VALUES(?,?,?,?,?)",
        ("cbse", "class-9", "english", '["Math"]', 1),
    )
    db.commit()
    row_id = db.execute("SELECT id FROM curriculum WHERE standard_id='class-9'").fetchone()[0]
    r = client.delete(f"/api/admin/curriculum/{row_id}", headers=admin)
    assert r.status_code == 200


def test_curriculum_import(client, admin):
    _seed_curriculum_prereqs(client, admin)
    r = client.post("/api/admin/curriculum/import", json={"rows": [{
        "board_id": "cbse", "standard_id": "class-10", "medium_id": "english",
        "subjects": ["Math", "Science"], "is_active": True,
    }]}, headers=admin)
    assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
#  Users management
# ═══════════════════════════════════════════════════════════════════════════════

def test_users_list(client, admin):
    r = client.get("/api/admin/users", headers=admin)
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list)
    ids = [u["id"] for u in users]
    assert USER_A in ids


def test_users_search(client, admin):
    r = client.get("/api/admin/users?search=Aarav", headers=admin)
    assert r.status_code == 200
    data = r.json()
    assert any("Aarav" in u.get("name", "") for u in data)


def test_users_filter_plan(client, admin):
    r = client.get("/api/admin/users?plan=free", headers=admin)
    assert r.status_code == 200


def test_update_user_plan(client, admin):
    r = client.put(f"/api/admin/users/{USER_A}/plan", json={"plan": "pro"}, headers=admin)
    assert r.status_code == 200
    assert r.json()["plan"] == "pro"


def test_toggle_drishti(client, admin):
    r = client.put(
        f"/api/admin/users/{USER_A}/drishti?is_drishti=true",
        headers=admin,
    )
    assert r.status_code == 200
    assert r.json()["is_drishti"] in (True, 1)


def test_user_ai_config(client, admin):
    r = client.put(
        f"/api/admin/users/{USER_A}/ai-config",
        json={"ai_provider": "openai", "ai_model": "gpt-4o", "ai_key": "", "clear_override": False},
        headers=admin,
    )
    assert r.status_code == 200


def test_create_drishti_student(client, admin):
    r = client.post("/api/admin/users/drishti", json={
        "id": "drishti-student-01",
        "name": "Drishti Student",
        "email": "drishti@test.com",
        "password": "pass1234",
        "standard": "Class 10",
        "board": "CBSE",
        "language": "English",
    }, headers=admin)
    assert r.status_code in (200, 201)


# ═══════════════════════════════════════════════════════════════════════════════
#  Usage
# ═══════════════════════════════════════════════════════════════════════════════

def test_usage_summary(client, admin):
    r = client.get("/api/admin/usage/summary?days=7", headers=admin)
    assert r.status_code == 200


def test_usage_by_date(client, admin, db):
    import datetime
    today = datetime.date.today().isoformat()
    db.execute(
        "INSERT INTO ai_usage(user_id,date,call_count) VALUES(?,?,?)",
        (USER_A, today, 5),
    )
    db.commit()
    r = client.get(f"/api/admin/usage/users?date={today}", headers=admin)
    assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
#  AI Config
# ═══════════════════════════════════════════════════════════════════════════════

def test_get_ai_config(client, admin):
    r = client.get("/api/admin/ai-config", headers=admin)
    assert r.status_code == 200


def test_put_ai_config(client, admin):
    r = client.put("/api/admin/ai-config", json={
        "routing": {"free": "gemini", "pro": "openai"},
    }, headers=admin)
    assert r.status_code == 200


def test_put_ai_key(client, admin):
    r = client.put("/api/admin/ai-keys", json={
        "provider": "groq",
        "slot": 1,
        "key": "test-groq-key-xxxx",
    }, headers=admin)
    assert r.status_code == 200


def test_delete_ai_key(client, admin):
    # Save a key first
    client.put("/api/admin/ai-keys", json={
        "provider": "groq", "slot": 2, "key": "delete-me",
    }, headers=admin)
    r = client.delete("/api/admin/ai-keys/groq/2", headers=admin)
    assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
#  Drishti Helpers
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture()
def helper_id(client, admin):
    r = client.post("/api/admin/drishti-helpers", json={
        "helper_name": "Test Helper",
        "helper_email": "helper@test.com",
        "helper_type": "teacher",
        "notes": "test notes",
    }, headers=admin)
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


def test_drishti_helpers_list(client, admin):
    r = client.get("/api/admin/drishti-helpers", headers=admin)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_drishti_helper_create(client, admin):
    r = client.post("/api/admin/drishti-helpers", json={
        "helper_name": "Helper One",
        "helper_email": "h1@test.com",
        "helper_type": "teacher",
        "notes": "",
    }, headers=admin)
    assert r.status_code in (200, 201)
    data = r.json()
    assert data["helper_name"] == "Helper One"
    assert "helper_token" in data


def test_drishti_helper_update(client, admin, helper_id):
    r = client.put(f"/api/admin/drishti-helpers/{helper_id}", json={
        "helper_name": "Updated Helper",
        "helper_type": "counsellor",
        "notes": "updated notes",
        "is_active": True,
    }, headers=admin)
    assert r.status_code == 200


def test_drishti_helper_deactivate(client, admin, helper_id):
    r = client.delete(f"/api/admin/drishti-helpers/{helper_id}", headers=admin)
    assert r.status_code == 200


def test_drishti_helper_get_students(client, admin, helper_id, db):
    db.execute(
        "INSERT INTO drishti_assignments(helper_id,student_id,is_active) VALUES(?,?,?)",
        (helper_id, USER_A, 1),
    )
    db.commit()
    r = client.get(f"/api/admin/drishti-helpers/{helper_id}/students", headers=admin)
    assert r.status_code == 200


def test_drishti_assign_student(client, admin, helper_id):
    r = client.post(
        f"/api/admin/drishti-helpers/{helper_id}/assign/{USER_A}",
        headers=admin,
    )
    assert r.status_code in (200, 201)


def test_drishti_unassign_student(client, admin, helper_id, db):
    db.execute(
        "INSERT INTO drishti_assignments(helper_id,student_id,is_active) VALUES(?,?,?)",
        (helper_id, USER_B, 1),
    )
    db.commit()
    r = client.delete(
        f"/api/admin/drishti-helpers/{helper_id}/assign/{USER_B}",
        headers=admin,
    )
    assert r.status_code == 200


def test_drishti_students_list(client, admin):
    r = client.get("/api/admin/drishti-students", headers=admin)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
