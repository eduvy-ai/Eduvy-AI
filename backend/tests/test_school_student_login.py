"""
tests/test_school_student_login.py
===================================
Tests for the school-provided student login flow:
  - Bulk import creates students with temp passwords + must_change_password
  - Student logs in with temp password → gets must_change_password flag
  - Student changes password → flag cleared
  - Student logs in with new password → no must_change_password flag
"""
import pytest
from conftest import admin_headers


# ── Bulk Import ───────────────────────────────────────────────────────────────

def test_bulk_import_creates_students_with_temp_password(client, db):
    """Bulk import sets must_change_password and returns temp_password."""
    # Create a school first
    db.execute(
        "INSERT INTO schools (name, school_code, plan, student_limit) VALUES (?, ?, ?, ?)",
        ("Test School", "TSTCODE1", "pilot", 100),
    )
    db.commit()
    school_id = db.execute("SELECT id FROM schools WHERE school_code='TSTCODE1'").fetchone()[0]

    # Seed admin with school_id in token
    from conftest import JWT_SECRET, JWT_ALGO
    from jose import jwt as jose_jwt
    from datetime import datetime, timedelta, timezone
    token = jose_jwt.encode(
        {"sub": "1", "role": "admin", "school_id": school_id,
         "exp": datetime.now(timezone.utc) + timedelta(hours=2)},
        JWT_SECRET, algorithm=JWT_ALGO,
    )

    r = client.post(
        "/api/admin/users/bulk-import",
        json={
            "students": [
                {"name": "Student One", "email": "s1@school.com", "standard": "Class 10", "board": "CBSE"},
                {"name": "Student Two", "email": "s2@school.com", "standard": "Class 10", "board": "CBSE"},
            ],
            "send_email": False,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["success"] == 2
    assert len(data["created_students"]) == 2
    for student in data["created_students"]:
        assert "temp_password" in student
        assert len(student["temp_password"]) > 0


def test_student_login_with_temp_password_returns_must_change(client, db):
    """Login with temp password returns must_change_password: true."""
    import bcrypt as _bcrypt

    temp_pw = "abc12345"
    pw_hash = _bcrypt.hashpw(temp_pw.encode(), _bcrypt.gensalt()).decode()

    db.execute(
        """INSERT INTO users (id, name, email, password_hash, must_change_password, temp_password, school_id)
           VALUES (?, ?, ?, ?, 1, ?, 1)""",
        ("stu-001", "School Student", "student@school.com", pw_hash, temp_pw),
    )
    db.commit()

    r = client.post("/api/auth/login", json={
        "email": "student@school.com",
        "password": temp_pw,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["must_change_password"] is True
    assert "token" in data
    assert data["profile"]["email"] == "student@school.com"


def test_change_password_clears_must_change_flag(client, db):
    """After changing password, must_change_password is cleared."""
    import bcrypt as _bcrypt

    temp_pw = "tempPass1"
    pw_hash = _bcrypt.hashpw(temp_pw.encode(), _bcrypt.gensalt()).decode()

    db.execute(
        """INSERT INTO users (id, name, email, password_hash, must_change_password, temp_password)
           VALUES (?, ?, ?, ?, 1, ?)""",
        ("stu-002", "Change Me", "change@school.com", pw_hash, temp_pw),
    )
    db.commit()

    # Login first to get token
    login_r = client.post("/api/auth/login", json={
        "email": "change@school.com",
        "password": temp_pw,
    })
    token = login_r.json()["token"]

    # Change password
    r = client.post(
        "/api/auth/change-password",
        json={"new_password": "newSecure123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True

    # Login with NEW password — no must_change_password flag
    r2 = client.post("/api/auth/login", json={
        "email": "change@school.com",
        "password": "newSecure123",
    })
    assert r2.status_code == 200
    assert r2.json().get("must_change_password") is None or r2.json().get("must_change_password") is False


def test_login_with_old_temp_password_fails_after_change(client, db):
    """Old temp password no longer works after password change."""
    import bcrypt as _bcrypt

    temp_pw = "oldTemp99"
    pw_hash = _bcrypt.hashpw(temp_pw.encode(), _bcrypt.gensalt()).decode()

    db.execute(
        """INSERT INTO users (id, name, email, password_hash, must_change_password, temp_password)
           VALUES (?, ?, ?, ?, 1, ?)""",
        ("stu-003", "Old Temp", "oldtemp@school.com", pw_hash, temp_pw),
    )
    db.commit()

    # Login and change
    login_r = client.post("/api/auth/login", json={"email": "oldtemp@school.com", "password": temp_pw})
    token = login_r.json()["token"]
    client.post("/api/auth/change-password", json={"new_password": "brandNew1"}, headers={"Authorization": f"Bearer {token}"})

    # Old temp password should fail
    r = client.post("/api/auth/login", json={"email": "oldtemp@school.com", "password": temp_pw})
    assert r.status_code == 401


def test_normal_student_login_no_must_change(client, db):
    """Self-registered students don't get must_change_password."""
    r = client.post("/api/auth/register", json={
        "email": "selfregister@test.com",
        "password": "myownpass123",
        "name": "Self Register",
    })
    assert r.status_code == 201

    r2 = client.post("/api/auth/login", json={
        "email": "selfregister@test.com",
        "password": "myownpass123",
    })
    assert r2.status_code == 200
    assert r2.json().get("must_change_password") is None or r2.json().get("must_change_password") is False
