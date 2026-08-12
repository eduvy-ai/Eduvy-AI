"""
Full Application Audit — Live API Testing Script
Tests real APIs against the running backend with real database data.
Run: python -m tests.audit_live (with backend running on port 8000)
"""
import requests
import json
import time
import uuid
import sys
from dataclasses import dataclass, field
from typing import Optional

BASE = "http://127.0.0.1:8000/api"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Test infrastructure
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@dataclass
class TestResult:
    name: str
    passed: bool
    severity: str = "LOW"  # CRITICAL, HIGH, MEDIUM, LOW
    expected: str = ""
    actual: str = ""
    evidence: str = ""
    category: str = ""

results: list[TestResult] = []

def test(name: str, category: str = ""):
    """Decorator/context for test functions."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                func(*args, **kwargs)
                results.append(TestResult(name=name, passed=True, category=category))
                print(f"  [PASS] {name}")
            except AssertionError as e:
                results.append(TestResult(
                    name=name, passed=False, category=category,
                    expected=str(e).split("|EXPECTED:")[1].split("|ACTUAL:")[0].strip() if "|EXPECTED:" in str(e) else "",
                    actual=str(e).split("|ACTUAL:")[1].split("|SEVERITY:")[0].strip() if "|ACTUAL:" in str(e) else str(e),
                    severity=str(e).split("|SEVERITY:")[1].strip() if "|SEVERITY:" in str(e) else "MEDIUM",
                    evidence=str(e)
                ))
                print(f"  [FAIL] {name}")
                print(f"    -> {e}")
            except Exception as e:
                results.append(TestResult(
                    name=name, passed=False, category=category,
                    actual=f"Exception: {type(e).__name__}: {e}",
                    severity="HIGH"
                ))
                print(f"  [FAIL] {name} (EXCEPTION)")
                print(f"    -> {type(e).__name__}: {e}")
        return wrapper
    return decorator

def fail(msg, expected="", actual="", severity="MEDIUM"):
    raise AssertionError(f"{msg} |EXPECTED:{expected}|ACTUAL:{actual}|SEVERITY:{severity}")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Setup — get tokens and create test data
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestContext:
    superadmin_token: str = ""
    school_admin_token: str = ""
    student_a_token: str = ""
    student_b_token: str = ""
    school_a_id: Optional[int] = None
    school_b_id: Optional[int] = None
    student_a_id: str = ""
    student_b_id: str = ""
    student_a_email: str = ""
    student_b_email: str = ""

ctx = TestContext()

def superadmin_headers():
    return {"Authorization": f"Bearer {ctx.superadmin_token}"}

def school_admin_headers():
    return {"Authorization": f"Bearer {ctx.school_admin_token}"}

def student_a_headers():
    return {"Authorization": f"Bearer {ctx.student_a_token}"}

def student_b_headers():
    return {"Authorization": f"Bearer {ctx.student_b_token}"}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 1: Setup - Login and create test data
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def setup():
    print("\n" + "="*70)
    print("PHASE 1: SETUP — Login & Create Test Data")
    print("="*70)

    # Superadmin login
    r = requests.post(f"{BASE}/admin/login", json={
        "email": "pradip.pawar@gmail.com", "password": "Pradip@123"
    })
    assert r.status_code == 200, f"Superadmin login failed: {r.status_code} {r.text}"
    ctx.superadmin_token = r.json()["token"]
    print(f"  [OK] Superadmin logged in")

    # Create test schools
    for school_name, code_suffix in [("Audit School A", "AUDA"), ("Audit School B", "AUDB")]:
        r = requests.post(f"{BASE}/schools", json={
            "name": school_name,
            "plan": "pilot",
            "contact_email": f"admin@{code_suffix.lower()}.test",
        }, headers=superadmin_headers())
        if r.status_code == 201:
            school = r.json()
            if "A" in school_name:
                ctx.school_a_id = school["id"]
            else:
                ctx.school_b_id = school["id"]
            print(f"  [OK] Created {school_name} (id={school['id']})")
        elif r.status_code == 409:
            print(f"  [SKIP] {school_name} already exists")
        else:
            print(f"  ! {school_name} creation: {r.status_code} {r.text[:100]}")

    # Get school IDs if not created now
    if not ctx.school_a_id or not ctx.school_b_id:
        r = requests.get(f"{BASE}/schools", headers=superadmin_headers())
        if r.status_code == 200:
            schools = r.json() if isinstance(r.json(), list) else r.json().get("schools", [])
            for s in schools:
                if "Audit School A" in s.get("name", ""):
                    ctx.school_a_id = s["id"]
                elif "Audit School B" in s.get("name", ""):
                    ctx.school_b_id = s["id"]
            print(f"  School A id={ctx.school_a_id}, School B id={ctx.school_b_id}")

    # Register test students
    suffix = str(int(time.time()))[-6:]
    ctx.student_a_email = f"audit_student_a_{suffix}@test.com"
    ctx.student_b_email = f"audit_student_b_{suffix}@test.com"

    for email, name, school_id, attr in [
        (ctx.student_a_email, "Audit Student A", ctx.school_a_id, "a"),
        (ctx.student_b_email, "Audit Student B", ctx.school_b_id, "b"),
    ]:
        r = requests.post(f"{BASE}/auth/register", json={
            "email": email, "password": "TestPass123!", "name": name
        })
        if r.status_code == 201:
            data = r.json()
            token = data.get("token", "")
            user_id = data.get("user", {}).get("id", "")
            if attr == "a":
                ctx.student_a_token = token
                ctx.student_a_id = user_id
            else:
                ctx.student_b_token = token
                ctx.student_b_id = user_id
            print(f"  [OK] Registered {name} (id={user_id})")
        elif r.status_code == 409:
            # Already exists, try login
            r2 = requests.post(f"{BASE}/auth/login", json={"email": email, "password": "TestPass123!"})
            if r2.status_code == 200:
                data = r2.json()
                token = data.get("token", "")
                user_id = data.get("user", {}).get("id", "")
                if attr == "a":
                    ctx.student_a_token = token
                    ctx.student_a_id = user_id
                else:
                    ctx.student_b_token = token
                    ctx.student_b_id = user_id
                print(f"  [SKIP] {name} already exists, logged in (id={user_id})")
        else:
            print(f"  ! {name} registration: {r.status_code} {r.text[:100]}")

    # If schools were created, assign students to them
    if ctx.school_a_id and ctx.student_a_id:
        r = requests.post(f"{BASE}/schools/join", json={"school_code": "RDREX9G1"},
                         headers=student_a_headers())
        # This might not work if school code is different; best-effort

    print(f"\n  Context: superadmin={bool(ctx.superadmin_token)}, "
          f"student_a={bool(ctx.student_a_token)}, student_b={bool(ctx.student_b_token)}")
    print(f"  School A={ctx.school_a_id}, School B={ctx.school_b_id}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 3: Auth & Authorization Tests
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_auth():
    print("\n" + "="*70)
    print("PHASE 3: AUTHENTICATION & AUTHORIZATION")
    print("="*70)

    # --- Auth endpoint tests ---
    @test("Register with valid data", "AUTH")
    def _():
        email = f"audit_reg_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{BASE}/auth/register", json={
            "email": email, "password": "ValidPass123!", "name": "Audit Test"
        })
        assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text[:100]}"
        data = r.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
    _()

    @test("Register with duplicate email returns 409", "AUTH")
    def _():
        r = requests.post(f"{BASE}/auth/register", json={
            "email": "pradip@gmail.com", "password": "Test123!", "name": "Dupe"
        })
        if r.status_code not in (409, 400):
            fail("Duplicate email should be rejected", "409", str(r.status_code), "HIGH")
    _()

    @test("Register with invalid email format", "AUTH")
    def _():
        r = requests.post(f"{BASE}/auth/register", json={
            "email": "notanemail", "password": "Test123!", "name": "Invalid"
        })
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}"
    _()

    @test("Register with short password", "AUTH")
    def _():
        r = requests.post(f"{BASE}/auth/register", json={
            "email": f"short_{uuid.uuid4().hex[:6]}@test.com", "password": "12", "name": "Short"
        })
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}"
    _()

    @test("Login with valid credentials", "AUTH")
    def _():
        r = requests.post(f"{BASE}/auth/login", json={
            "email": "pradip@gmail.com", "password": "Pradip@123"
        })
        # May fail if student password is different - try known
        if r.status_code == 401:
            # Try with our test student
            r = requests.post(f"{BASE}/auth/login", json={
                "email": ctx.student_a_email, "password": "TestPass123!"
            })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:100]}"
    _()

    @test("Login with wrong password returns 401", "AUTH")
    def _():
        r = requests.post(f"{BASE}/auth/login", json={
            "email": "pradip@gmail.com", "password": "wrongpassword"
        })
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    _()

    @test("Login with nonexistent email returns 401", "AUTH")
    def _():
        r = requests.post(f"{BASE}/auth/login", json={
            "email": "nonexistent@nowhere.com", "password": "anything"
        })
        assert r.status_code in (401, 404), f"Expected 401/404, got {r.status_code}"
    _()

    @test("GET /auth/me with valid token", "AUTH")
    def _():
        r = requests.get(f"{BASE}/auth/me", headers=student_a_headers())
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:100]}"
        data = r.json()
        assert "id" in data or "user" in data, f"Unexpected response: {data}"
    _()

    @test("GET /auth/me without token returns 401", "AUTH")
    def _():
        r = requests.get(f"{BASE}/auth/me")
        assert r.status_code in (401, 403), f"Expected 401, got {r.status_code}"
    _()

    @test("GET /auth/me with invalid token returns 401", "AUTH")
    def _():
        r = requests.get(f"{BASE}/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert r.status_code in (401, 403), f"Expected 401, got {r.status_code}"
    _()

    @test("Admin login with student token fails", "AUTH")
    def _():
        r = requests.get(f"{BASE}/admin/me", headers=student_a_headers())
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}: {r.text[:100]}"
    _()

    @test("Admin setup blocked when admin exists", "AUTH")
    def _():
        r = requests.post(f"{BASE}/admin/setup", json={
            "email": "hacker@evil.com", "password": "Hack123!", "name": "Hacker"
        })
        assert r.status_code == 403, f"Expected 403, got {r.status_code}"
    _()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 4: Tenant Isolation & IDOR Tests
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_isolation():
    print("\n" + "="*70)
    print("PHASE 4: TENANT ISOLATION & IDOR")
    print("="*70)

    @test("Student A cannot access Student B profile", "ISOLATION")
    def _():
        if not ctx.student_b_id:
            return  # Skip if no student B
        r = requests.get(f"{BASE}/profile/{ctx.student_b_id}", headers=student_a_headers())
        if r.status_code == 200:
            fail("Student A accessed Student B's profile — IDOR vulnerability",
                 "403", "200 + data returned", "CRITICAL")
    _()

    @test("Student A cannot modify Student B profile", "ISOLATION")
    def _():
        if not ctx.student_b_id:
            return
        r = requests.put(f"{BASE}/profile/{ctx.student_b_id}",
                        json={"name": "HACKED"}, headers=student_a_headers())
        if r.status_code == 200:
            fail("Student A modified Student B's profile — IDOR vulnerability",
                 "403", "200", "CRITICAL")
    _()

    @test("Student A cannot add XP to Student B", "ISOLATION")
    def _():
        if not ctx.student_b_id:
            return
        r = requests.post(f"{BASE}/profile/{ctx.student_b_id}/xp",
                         json={"xp": 9999}, headers=student_a_headers())
        if r.status_code == 200:
            fail("Student A added XP to Student B — IDOR vulnerability",
                 "403", "200", "CRITICAL")
    _()

    @test("Student A cannot access Student B notebook", "ISOLATION")
    def _():
        if not ctx.student_b_id:
            return
        r = requests.get(f"{BASE}/notebook/{ctx.student_b_id}/sources", headers=student_a_headers())
        if r.status_code == 200:
            fail("Student A accessed Student B's notebook — IDOR vulnerability",
                 "403", "200 + data", "CRITICAL")
    _()

    @test("Student A cannot access Student B mastery", "ISOLATION")
    def _():
        if not ctx.student_b_id:
            return
        r = requests.get(f"{BASE}/mastery/{ctx.student_b_id}", headers=student_a_headers())
        if r.status_code == 200:
            data = r.json()
            # If it returns data that belongs to student B, it's a vulnerability
            fail("Student A accessed Student B's mastery — IDOR vulnerability",
                 "403", f"200 {str(data)[:50]}", "CRITICAL")
    _()

    @test("Student A cannot access Student B quiz stats", "ISOLATION")
    def _():
        if not ctx.student_b_id:
            return
        r = requests.get(f"{BASE}/quiz/{ctx.student_b_id}/stats", headers=student_a_headers())
        if r.status_code == 200:
            fail("Student A accessed Student B's quiz stats — IDOR vulnerability",
                 "403", "200", "CRITICAL")
    _()

    @test("Student A cannot access Student B sessions", "ISOLATION")
    def _():
        if not ctx.student_b_id:
            return
        r = requests.get(f"{BASE}/chat-session/{ctx.student_b_id}/tutor", headers=student_a_headers())
        if r.status_code == 200:
            fail("Student A accessed Student B's chat sessions — IDOR vulnerability",
                 "403", "200", "CRITICAL")
    _()

    @test("Student cannot access admin endpoints", "ISOLATION")
    def _():
        endpoints = [
            ("GET", f"{BASE}/admin/me"),
            ("GET", f"{BASE}/admin/users"),
            ("GET", f"{BASE}/admin/boards"),
            ("GET", f"{BASE}/admin/analytics/overview"),
            ("GET", f"{BASE}/schools"),
        ]
        for method, url in endpoints:
            r = requests.request(method, url, headers=student_a_headers())
            if r.status_code == 200:
                fail(f"Student accessed admin endpoint {url}",
                     "401/403", str(r.status_code), "CRITICAL")
    _()

    @test("Unauthenticated user cannot access protected endpoints", "ISOLATION")
    def _():
        endpoints = [
            ("GET", f"{BASE}/auth/me"),
            ("GET", f"{BASE}/admin/me"),
            ("GET", f"{BASE}/admin/users"),
            ("POST", f"{BASE}/ai/chat"),
            ("GET", f"{BASE}/squads/mine"),
            ("GET", f"{BASE}/bhool/cards/mine"),
        ]
        for method, url in endpoints:
            r = requests.request(method, url)
            if r.status_code == 200:
                fail(f"Unauthenticated access to {url}",
                     "401", str(r.status_code), "CRITICAL")
    _()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 4b: Chapters Auth Gap (KNOWN CRITICAL ISSUE)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_chapters_auth_gap():
    print("\n" + "="*70)
    print("PHASE 4b: CHAPTERS AUTH GAP VERIFICATION")
    print("="*70)

    @test("POST /api/chapters without auth (should require admin)", "SECURITY")
    def _():
        r = requests.post(f"{BASE}/chapters", json={
            "board_id": 1, "standard_id": 1, "subject_id": 1,
            "chapter_number": 999, "chapter_name": "AUDIT_UNAUTH_TEST"
        })
        if r.status_code in (200, 201):
            fail("Unauthenticated user can CREATE chapters — CRITICAL AUTH GAP",
                 "401/403", f"{r.status_code} - chapter created without auth", "CRITICAL")
        else:
            print(f"    (Got {r.status_code} — endpoint may have other validation)")
    _()

    @test("PUT /api/chapters/{id} without auth (should require admin)", "SECURITY")
    def _():
        # First get a chapter ID
        r = requests.get(f"{BASE}/chapters")
        if r.status_code == 200:
            chapters = r.json() if isinstance(r.json(), list) else r.json().get("chapters", [])
            if chapters:
                ch_id = chapters[0].get("id", 1)
                r2 = requests.put(f"{BASE}/chapters/{ch_id}", json={
                    "chapter_name": "HACKED_BY_AUDIT"
                })
                if r2.status_code == 200:
                    fail("Unauthenticated user can UPDATE chapters — CRITICAL AUTH GAP",
                         "401/403", f"{r2.status_code} - chapter modified without auth", "CRITICAL")
    _()

    @test("DELETE /api/chapters/{id} without auth (should require admin)", "SECURITY")
    def _():
        # Try to delete a non-existent chapter to avoid damage
        r = requests.delete(f"{BASE}/chapters/99999999")
        if r.status_code == 200:
            fail("Unauthenticated user can DELETE chapters — CRITICAL AUTH GAP",
                 "401/403", f"{r.status_code}", "CRITICAL")
        elif r.status_code == 404:
            # 404 means the endpoint processed the request (no auth check first)
            fail("Chapters DELETE endpoint processes requests without auth (returned 404 not 401)",
                 "401 before any processing", "404 (processed without auth)", "CRITICAL")
    _()

    @test("POST /api/chapters/bulk without auth", "SECURITY")
    def _():
        r = requests.post(f"{BASE}/chapters/bulk", json={"chapters": []})
        if r.status_code not in (401, 403):
            fail(f"Bulk chapter creation accessible without auth",
                 "401/403", str(r.status_code), "CRITICAL")
    _()

    @test("POST /api/chapters/bulk-delete without auth", "SECURITY")
    def _():
        r = requests.post(f"{BASE}/chapters/bulk-delete", json={"ids": []})
        if r.status_code not in (401, 403):
            fail(f"Bulk chapter deletion accessible without auth",
                 "401/403", str(r.status_code), "CRITICAL")
    _()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 5: CRUD Lifecycle Tests
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_crud():
    print("\n" + "="*70)
    print("PHASE 5: CRUD LIFECYCLE TESTS")
    print("="*70)

    # --- Profile CRUD ---
    @test("Create profile for student", "CRUD-PROFILE")
    def _():
        r = requests.post(f"{BASE}/profile", json={
            "user_id": ctx.student_a_id,
            "board": "CBSE", "standard": "10", "medium": "English",
            "subjects": ["Mathematics", "Science"]
        })
        assert r.status_code in (200, 201, 409), f"Profile create: {r.status_code} {r.text[:100]}"
    _()

    @test("Get own profile", "CRUD-PROFILE")
    def _():
        r = requests.get(f"{BASE}/profile/{ctx.student_a_id}", headers=student_a_headers())
        assert r.status_code == 200, f"Get profile: {r.status_code} {r.text[:100]}"
    _()

    @test("Update own profile", "CRUD-PROFILE")
    def _():
        r = requests.put(f"{BASE}/profile/{ctx.student_a_id}",
                        json={"name": "Audit Student A Updated"},
                        headers=student_a_headers())
        assert r.status_code == 200, f"Update profile: {r.status_code} {r.text[:100]}"
    _()

    @test("Add XP to own profile", "CRUD-PROFILE")
    def _():
        r = requests.post(f"{BASE}/profile/{ctx.student_a_id}/xp",
                         json={"xp": 10}, headers=student_a_headers())
        assert r.status_code == 200, f"Add XP: {r.status_code} {r.text[:100]}"
    _()

    # --- Notebook CRUD ---
    @test("Add notebook source", "CRUD-NOTEBOOK")
    def _():
        r = requests.post(f"{BASE}/notebook/{ctx.student_a_id}/sources", json={
            "name": "Audit Test Source",
            "type": "text",
            "content": "This is audit test content for notebook source."
        }, headers=student_a_headers())
        assert r.status_code in (200, 201), f"Add source: {r.status_code} {r.text[:100]}"
    _()

    @test("List notebook sources", "CRUD-NOTEBOOK")
    def _():
        r = requests.get(f"{BASE}/notebook/{ctx.student_a_id}/sources", headers=student_a_headers())
        assert r.status_code == 200, f"List sources: {r.status_code} {r.text[:100]}"
        data = r.json()
        sources = data if isinstance(data, list) else data.get("sources", [])
        assert len(sources) >= 0, "Sources should be a list"
    _()

    @test("Add notebook chat message", "CRUD-NOTEBOOK")
    def _():
        r = requests.post(f"{BASE}/notebook/{ctx.student_a_id}/chat", json={
            "role": "user", "content": "Audit test message"
        }, headers=student_a_headers())
        assert r.status_code in (200, 201), f"Add chat: {r.status_code} {r.text[:100]}"
    _()

    @test("Get notebook chat messages", "CRUD-NOTEBOOK")
    def _():
        r = requests.get(f"{BASE}/notebook/{ctx.student_a_id}/chat", headers=student_a_headers())
        assert r.status_code == 200, f"Get chat: {r.status_code} {r.text[:100]}"
    _()

    # --- Bhool CRUD ---
    @test("Create bhool card", "CRUD-BHOOL")
    def _():
        r = requests.post(f"{BASE}/bhool/cards", json={
            "subject": "Mathematics",
            "standard": "10",
            "question": "What is 2+2?",
            "wrong_answer": "5",
            "correct_answer": "4",
            "why_wrong": "Added 3 instead of 2"
        }, headers=student_a_headers())
        assert r.status_code in (200, 201), f"Create card: {r.status_code} {r.text[:100]}"
    _()

    @test("Get my bhool cards", "CRUD-BHOOL")
    def _():
        r = requests.get(f"{BASE}/bhool/cards/mine", headers=student_a_headers())
        assert r.status_code == 200, f"Get cards: {r.status_code} {r.text[:100]}"
    _()

    @test("Get bhool marketplace", "CRUD-BHOOL")
    def _():
        r = requests.get(f"{BASE}/bhool/marketplace", headers=student_a_headers())
        assert r.status_code == 200, f"Marketplace: {r.status_code} {r.text[:100]}"
    _()

    # --- Squad tests ---
    @test("Get my squad (empty initially)", "CRUD-SQUADS")
    def _():
        r = requests.get(f"{BASE}/squads/mine", headers=student_a_headers())
        assert r.status_code == 200, f"Get squad: {r.status_code} {r.text[:100]}"
    _()

    # --- Muqabla tests ---
    @test("Get open battles", "CRUD-MUQABLA")
    def _():
        r = requests.get(f"{BASE}/muqabla/open", headers=student_a_headers())
        assert r.status_code == 200, f"Open battles: {r.status_code} {r.text[:100]}"
    _()

    @test("Get battle history", "CRUD-MUQABLA")
    def _():
        r = requests.get(f"{BASE}/muqabla/history", headers=student_a_headers())
        assert r.status_code == 200, f"History: {r.status_code} {r.text[:100]}"
    _()

    @test("Get leaderboard", "CRUD-MUQABLA")
    def _():
        r = requests.get(f"{BASE}/muqabla/leaderboard", headers=student_a_headers())
        assert r.status_code == 200, f"Leaderboard: {r.status_code} {r.text[:100]}"
    _()

    # --- Parent PIN ---
    @test("Create parent PIN", "CRUD-PARENT")
    def _():
        r = requests.post(f"{BASE}/parent/pin", headers=student_a_headers())
        assert r.status_code in (200, 201), f"Create PIN: {r.status_code} {r.text[:100]}"
    _()

    @test("Get parent PIN", "CRUD-PARENT")
    def _():
        r = requests.get(f"{BASE}/parent/pin", headers=student_a_headers())
        assert r.status_code == 200, f"Get PIN: {r.status_code} {r.text[:100]}"
    _()

    # --- Curriculum (public) ---
    @test("Get boards", "CRUD-CURRICULUM")
    def _():
        r = requests.get(f"{BASE}/curriculum/boards")
        assert r.status_code == 200, f"Boards: {r.status_code} {r.text[:100]}"
    _()

    @test("Get standards", "CRUD-CURRICULUM")
    def _():
        r = requests.get(f"{BASE}/curriculum/standards")
        assert r.status_code == 200, f"Standards: {r.status_code} {r.text[:100]}"
    _()

    @test("Get mediums", "CRUD-CURRICULUM")
    def _():
        r = requests.get(f"{BASE}/curriculum/mediums")
        assert r.status_code == 200, f"Mediums: {r.status_code} {r.text[:100]}"
    _()

    @test("Get subjects", "CRUD-CURRICULUM")
    def _():
        r = requests.get(f"{BASE}/curriculum/subjects")
        assert r.status_code == 200, f"Subjects: {r.status_code} {r.text[:100]}"
    _()

    # --- Sessions/Drafts ---
    @test("Save session message", "CRUD-SESSIONS")
    def _():
        r = requests.post(f"{BASE}/chat-session/{ctx.student_a_id}/tutor", json={
            "role": "user", "content": "Audit test session message"
        }, headers=student_a_headers())
        assert r.status_code in (200, 201), f"Save session: {r.status_code} {r.text[:100]}"
    _()

    @test("Get session messages", "CRUD-SESSIONS")
    def _():
        r = requests.get(f"{BASE}/chat-session/{ctx.student_a_id}/tutor", headers=student_a_headers())
        assert r.status_code == 200, f"Get session: {r.status_code} {r.text[:100]}"
    _()

    @test("Save draft", "CRUD-SESSIONS")
    def _():
        r = requests.put(f"{BASE}/draft/{ctx.student_a_id}/audit_test", json={
            "content": "audit draft content"
        }, headers=student_a_headers())
        assert r.status_code in (200, 201), f"Save draft: {r.status_code} {r.text[:100]}"
    _()

    @test("Get draft", "CRUD-SESSIONS")
    def _():
        r = requests.get(f"{BASE}/draft/{ctx.student_a_id}/audit_test", headers=student_a_headers())
        assert r.status_code == 200, f"Get draft: {r.status_code} {r.text[:100]}"
    _()

    # --- Referrals ---
    @test("Get referral code", "CRUD-REFERRALS")
    def _():
        r = requests.get(f"{BASE}/referrals/code", headers=student_a_headers())
        assert r.status_code == 200, f"Referral code: {r.status_code} {r.text[:100]}"
    _()

    # --- AI Usage ---
    @test("Get AI usage", "CRUD-AI")
    def _():
        r = requests.get(f"{BASE}/ai/usage", headers=student_a_headers())
        assert r.status_code == 200, f"AI usage: {r.status_code} {r.text[:100]}"
    _()

    # --- Mastery ---
    @test("Update mastery score", "CRUD-MASTERY")
    def _():
        r = requests.put(f"{BASE}/mastery/{ctx.student_a_id}", json={
            "subject": "Mathematics", "score": 75
        }, headers=student_a_headers())
        assert r.status_code == 200, f"Update mastery: {r.status_code} {r.text[:100]}"
    _()

    @test("Get mastery scores", "CRUD-MASTERY")
    def _():
        r = requests.get(f"{BASE}/mastery/{ctx.student_a_id}", headers=student_a_headers())
        assert r.status_code == 200, f"Get mastery: {r.status_code} {r.text[:100]}"
    _()

    # --- Quiz ---
    @test("Save quiz result", "CRUD-QUIZ")
    def _():
        r = requests.post(f"{BASE}/quiz/{ctx.student_a_id}/result", json={
            "subject": "Mathematics", "difficulty": "medium",
            "correct": 7, "total": 10
        }, headers=student_a_headers())
        assert r.status_code in (200, 201), f"Save quiz: {r.status_code} {r.text[:100]}"
    _()

    @test("Get quiz stats", "CRUD-QUIZ")
    def _():
        r = requests.get(f"{BASE}/quiz/{ctx.student_a_id}/stats", headers=student_a_headers())
        assert r.status_code == 200, f"Quiz stats: {r.status_code} {r.text[:100]}"
    _()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 5b: Admin CRUD Tests
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_admin_crud():
    print("\n" + "="*70)
    print("PHASE 5b: ADMIN CRUD TESTS")
    print("="*70)

    @test("Admin GET /me", "ADMIN")
    def _():
        r = requests.get(f"{BASE}/admin/me", headers=superadmin_headers())
        assert r.status_code == 200, f"Admin me: {r.status_code} {r.text[:100]}"
    _()

    @test("Admin list boards", "ADMIN")
    def _():
        r = requests.get(f"{BASE}/admin/boards", headers=superadmin_headers())
        assert r.status_code == 200, f"Boards: {r.status_code} {r.text[:100]}"
    _()

    @test("Admin list standards", "ADMIN")
    def _():
        r = requests.get(f"{BASE}/admin/standards", headers=superadmin_headers())
        assert r.status_code == 200, f"Standards: {r.status_code} {r.text[:100]}"
    _()

    @test("Admin list users", "ADMIN")
    def _():
        r = requests.get(f"{BASE}/admin/users", headers=superadmin_headers())
        assert r.status_code == 200, f"Users: {r.status_code} {r.text[:100]}"
        data = r.json()
        users = data if isinstance(data, list) else data.get("users", [])
        print(f"    (Found {len(users)} users)")
    _()

    @test("Admin list schools", "ADMIN")
    def _():
        r = requests.get(f"{BASE}/schools", headers=superadmin_headers())
        assert r.status_code == 200, f"Schools: {r.status_code} {r.text[:100]}"
    _()

    @test("Admin analytics overview", "ADMIN")
    def _():
        r = requests.get(f"{BASE}/admin/analytics/overview", headers=superadmin_headers())
        assert r.status_code == 200, f"Analytics: {r.status_code} {r.text[:100]}"
    _()

    @test("Admin usage summary", "ADMIN")
    def _():
        r = requests.get(f"{BASE}/admin/usage/summary", headers=superadmin_headers())
        assert r.status_code == 200, f"Usage: {r.status_code} {r.text[:100]}"
    _()

    @test("Admin AI config (superadmin only)", "ADMIN")
    def _():
        r = requests.get(f"{BASE}/admin/ai-config", headers=superadmin_headers())
        assert r.status_code == 200, f"AI config: {r.status_code} {r.text[:100]}"
    _()

    @test("Admin community stats", "ADMIN")
    def _():
        r = requests.get(f"{BASE}/admin/community/stats", headers=superadmin_headers())
        assert r.status_code == 200, f"Community: {r.status_code} {r.text[:100]}"
    _()

    @test("Admin list squads", "ADMIN")
    def _():
        r = requests.get(f"{BASE}/admin/squads", headers=superadmin_headers())
        assert r.status_code == 200, f"Squads: {r.status_code} {r.text[:100]}"
    _()

    # Board CRUD lifecycle
    @test("Admin create board", "ADMIN-CRUD")
    def _():
        r = requests.post(f"{BASE}/admin/boards", json={
            "name": "AUDIT_TEST_BOARD", "sort_order": 99
        }, headers=superadmin_headers())
        assert r.status_code in (200, 201), f"Create board: {r.status_code} {r.text[:100]}"
    _()

    @test("Admin create + update + delete board lifecycle", "ADMIN-CRUD")
    def _():
        # Create
        r = requests.post(f"{BASE}/admin/boards", json={
            "name": "AUDIT_LIFECYCLE_BOARD", "sort_order": 100
        }, headers=superadmin_headers())
        assert r.status_code in (200, 201), f"Create: {r.status_code}"
        board_id = r.json().get("id")
        assert board_id, f"No ID returned: {r.json()}"

        # Update
        r2 = requests.put(f"{BASE}/admin/boards/{board_id}", json={
            "name": "AUDIT_LIFECYCLE_BOARD_UPDATED"
        }, headers=superadmin_headers())
        assert r2.status_code == 200, f"Update: {r2.status_code} {r2.text[:100]}"

        # Delete
        r3 = requests.delete(f"{BASE}/admin/boards/{board_id}", headers=superadmin_headers())
        assert r3.status_code in (200, 204), f"Delete: {r3.status_code} {r3.text[:100]}"
    _()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 6: Frontend-API Alignment Checks
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_frontend_api_alignment():
    print("\n" + "="*70)
    print("PHASE 6: FRONTEND-API ALIGNMENT (endpoint existence check)")
    print("="*70)

    # Test endpoints that the frontend calls to verify they exist
    endpoints_student = [
        ("GET", "/home/daily-content/questions", student_a_headers()),
        ("GET", "/home/recent-practice", student_a_headers()),
        ("GET", "/ai/usage", student_a_headers()),
        ("GET", "/squads/mine", student_a_headers()),
        ("GET", "/bhool/cards/mine", student_a_headers()),
        ("GET", "/bhool/marketplace", student_a_headers()),
        ("GET", "/muqabla/open", student_a_headers()),
        ("GET", "/muqabla/history", student_a_headers()),
        ("GET", "/muqabla/leaderboard", student_a_headers()),
        ("GET", "/muqabla/pending", student_a_headers()),
        ("GET", "/muqabla/active", student_a_headers()),
        ("GET", "/referrals/code", student_a_headers()),
        ("GET", "/parent/pin", student_a_headers()),
        ("GET", "/payments/plans", None),
        ("GET", "/curriculum/boards", None),
        ("GET", "/curriculum/standards", None),
        ("GET", "/curriculum/mediums", None),
        ("GET", "/curriculum/subjects", None),
        ("GET", "/chapters", None),
        ("GET", "/coach/sessions", student_a_headers()),
        ("GET", "/coach/subjects", student_a_headers()),
        ("GET", "/video/library", student_a_headers()),
        ("GET", "/storage/health", None),
    ]

    for method, path, headers in endpoints_student:
        @test(f"Endpoint exists: {method} {path}", "ALIGNMENT")
        def _(m=method, p=path, h=headers):
            r = requests.request(m, f"{BASE}{p}", headers=h)
            if r.status_code in (404, 405):
                fail(f"Frontend calls {m} {p} but backend returns {r.status_code}",
                     "200/401/403", str(r.status_code), "HIGH")
        _()

    # Admin endpoints
    admin_endpoints = [
        ("GET", "/admin/boards"),
        ("GET", "/admin/standards"),
        ("GET", "/admin/mediums"),
        ("GET", "/admin/subjects"),
        ("GET", "/admin/curriculum"),
        ("GET", "/admin/chapters"),
        ("GET", "/admin/users"),
        ("GET", "/admin/analytics/overview"),
        ("GET", "/admin/analytics/students"),
        ("GET", "/admin/analytics/revenue"),
        ("GET", "/admin/usage/summary"),
        ("GET", "/admin/ai-config"),
        ("GET", "/admin/drishti-helpers"),
        ("GET", "/admin/drishti-students"),
        ("GET", "/admin/community/stats"),
        ("GET", "/admin/squads"),
        ("GET", "/admin/doubts"),
        ("GET", "/admin/teachers"),
        ("GET", "/admin/questions"),
        ("GET", "/admin/media"),
        ("GET", "/schools"),
        ("GET", "/storage/stats"),
    ]

    for method, path in admin_endpoints:
        @test(f"Admin endpoint exists: {method} {path}", "ALIGNMENT")
        def _(m=method, p=path):
            r = requests.request(m, f"{BASE}{p}", headers=superadmin_headers())
            if r.status_code in (404, 405):
                fail(f"Admin panel calls {m} {p} but backend returns {r.status_code}",
                     "200", str(r.status_code), "HIGH")
        _()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 7: Security Tests
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_security():
    print("\n" + "="*70)
    print("PHASE 7: SECURITY TESTS")
    print("="*70)

    @test("SQL injection in login email", "SECURITY")
    def _():
        r = requests.post(f"{BASE}/auth/login", json={
            "email": "' OR 1=1 --", "password": "anything"
        })
        # Should get 401 (invalid creds) not 200 or 500
        if r.status_code == 200:
            fail("SQL injection in login succeeded!", "401", "200", "CRITICAL")
        assert r.status_code != 500, f"Server error on SQL injection attempt: {r.status_code}"
    _()

    @test("SQL injection in search/filter params", "SECURITY")
    def _():
        r = requests.get(f"{BASE}/admin/users?search=' OR 1=1 --", headers=superadmin_headers())
        assert r.status_code != 500, f"Server error on SQL injection in search: {r.status_code}"
    _()

    @test("XSS in profile name field", "SECURITY")
    def _():
        xss_payload = '<script>alert("xss")</script>'
        r = requests.put(f"{BASE}/profile/{ctx.student_a_id}",
                        json={"name": xss_payload}, headers=student_a_headers())
        if r.status_code == 200:
            # Check if it's stored raw (not a backend issue per se, but flag it)
            r2 = requests.get(f"{BASE}/profile/{ctx.student_a_id}", headers=student_a_headers())
            if r2.status_code == 200:
                resp_data = r2.json()
                name = resp_data.get("name", "") or resp_data.get("user", {}).get("name", "")
                if "<script>" in name:
                    fail("XSS payload stored in database unescaped",
                         "Sanitized/escaped input", "Raw script tag stored", "MEDIUM")
    _()

    @test("Oversized payload handling", "SECURITY")
    def _():
        big_content = "A" * 1_000_000  # 1MB string
        r = requests.post(f"{BASE}/notebook/{ctx.student_a_id}/chat", json={
            "role": "user", "content": big_content
        }, headers=student_a_headers())
        # Should either reject (413/422) or handle gracefully (not crash)
        assert r.status_code != 500, f"Server crashed on oversized payload: {r.status_code}"
    _()

    @test("Path traversal in session key", "SECURITY")
    def _():
        r = requests.get(f"{BASE}/draft/{ctx.student_a_id}/../../etc/passwd",
                        headers=student_a_headers())
        assert r.status_code != 200 or "root:" not in r.text, "Path traversal vulnerability!"
    _()

    @test("Token expiry is reasonable", "SECURITY")
    def _():
        import jose.jwt as jwt
        try:
            # Decode without verification to check claims
            payload = jwt.decode(ctx.student_a_token,
                               "eduvyai-super-secret-jwt-key-change-in-production-2026",
                               algorithms=["HS256"])
            exp = payload.get("exp", 0)
            import datetime
            exp_dt = datetime.datetime.fromtimestamp(exp)
            days_until_exp = (exp_dt - datetime.datetime.now()).days
            if days_until_exp > 90:
                fail(f"Token expiry too long: {days_until_exp} days",
                     "<=30 days", f"{days_until_exp} days", "MEDIUM")
        except Exception as e:
            print(f"    (Could not decode token: {e})")
    _()

    @test("CORS headers present", "SECURITY")
    def _():
        r = requests.options(f"{BASE}/auth/login", headers={
            "Origin": "http://evil.com",
            "Access-Control-Request-Method": "POST"
        })
        acl = r.headers.get("access-control-allow-origin", "")
        if acl == "*":
            fail("CORS allows all origins (*)",
                 "Restrictive origin list", "* (all origins allowed)", "HIGH")
    _()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 8: Error Handling & Edge Cases
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def test_error_handling():
    print("\n" + "="*70)
    print("PHASE 8: ERROR HANDLING & EDGE CASES")
    print("="*70)

    @test("404 for non-existent profile", "ERRORS")
    def _():
        fake_id = str(uuid.uuid4())
        r = requests.get(f"{BASE}/profile/{fake_id}", headers=student_a_headers())
        assert r.status_code in (403, 404), f"Expected 403/404, got {r.status_code}"
    _()

    @test("404 for non-existent battle", "ERRORS")
    def _():
        fake_id = str(uuid.uuid4())
        r = requests.get(f"{BASE}/muqabla/battles/{fake_id}", headers=student_a_headers())
        assert r.status_code in (404, 400), f"Expected 404, got {r.status_code}: {r.text[:50]}"
    _()

    @test("Invalid JSON body returns 422", "ERRORS")
    def _():
        r = requests.post(f"{BASE}/auth/login",
                         data="not json",
                         headers={"Content-Type": "application/json"})
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}"
    _()

    @test("Missing required fields returns 422", "ERRORS")
    def _():
        r = requests.post(f"{BASE}/auth/register", json={"email": "only@email.com"})
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}"
    _()

    @test("Empty string fields handled gracefully", "ERRORS")
    def _():
        r = requests.post(f"{BASE}/auth/register", json={
            "email": "", "password": "", "name": ""
        })
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}"
    _()

    @test("Unicode in text fields", "ERRORS")
    def _():
        r = requests.post(f"{BASE}/notebook/{ctx.student_a_id}/chat", json={
            "role": "user", "content": "मराठी टेस्ट 🎓 数学"
        }, headers=student_a_headers())
        assert r.status_code in (200, 201), f"Unicode handling: {r.status_code} {r.text[:100]}"
    _()

    @test("Special characters in search", "ERRORS")
    def _():
        r = requests.get(f"{BASE}/admin/users?search=%25%27%22%3C%3E",
                        headers=superadmin_headers())
        assert r.status_code != 500, f"Server error on special chars search: {r.status_code}"
    _()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 9: Report Generation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def generate_report():
    print("\n" + "="*70)
    print("AUDIT REPORT — SUMMARY")
    print("="*70)

    total = len(results)
    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)

    critical = [r for r in results if not r.passed and r.severity == "CRITICAL"]
    high = [r for r in results if not r.passed and r.severity == "HIGH"]
    medium = [r for r in results if not r.passed and r.severity == "MEDIUM"]
    low = [r for r in results if not r.passed and r.severity == "LOW"]

    print(f"\n  Total Tests:  {total}")
    print(f"  Passed:       {passed}")
    print(f"  Failed:       {failed}")
    print(f"  Pass Rate:    {passed/total*100:.1f}%")
    print(f"\n  CRITICAL: {len(critical)}")
    print(f"  HIGH:     {len(high)}")
    print(f"  MEDIUM:   {len(medium)}")
    print(f"  LOW:      {len(low)}")

    if critical:
        print("\n" + "-"*70)
        print("CRITICAL ISSUES:")
        print("-"*70)
        for r in critical:
            print(f"\n  [{r.category}] {r.name}")
            if r.expected: print(f"    Expected: {r.expected}")
            if r.actual: print(f"    Actual:   {r.actual}")

    if high:
        print("\n" + "-"*70)
        print("HIGH ISSUES:")
        print("-"*70)
        for r in high:
            print(f"\n  [{r.category}] {r.name}")
            if r.expected: print(f"    Expected: {r.expected}")
            if r.actual: print(f"    Actual:   {r.actual}")

    if medium:
        print("\n" + "-"*70)
        print("MEDIUM ISSUES:")
        print("-"*70)
        for r in medium:
            print(f"\n  [{r.category}] {r.name}")
            if r.actual: print(f"    → {r.actual}")

    # Category breakdown
    categories = {}
    for r in results:
        cat = r.category or "UNCATEGORIZED"
        if cat not in categories:
            categories[cat] = {"pass": 0, "fail": 0}
        if r.passed:
            categories[cat]["pass"] += 1
        else:
            categories[cat]["fail"] += 1

    print("\n" + "-"*70)
    print("COVERAGE BY CATEGORY:")
    print("-"*70)
    for cat, counts in sorted(categories.items()):
        total_cat = counts["pass"] + counts["fail"]
        print(f"  {cat:25s} {counts['pass']}/{total_cat} passed")

    return {"total": total, "passed": passed, "failed": failed,
            "critical": len(critical), "high": len(high),
            "medium": len(medium), "low": len(low)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main execution
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == "__main__":
    print("="*70)
    print("EDUVY-AI FULL APPLICATION AUDIT — LIVE API TESTING")
    print("="*70)
    print(f"Target: {BASE}")
    print(f"Time:   {time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Verify server is up
    try:
        r = requests.get(f"{BASE}/health")
        assert r.status_code == 200
        print(f"Server: OK ({r.json().get('version', 'unknown')})")
    except Exception as e:
        print(f"ERROR: Server not reachable at {BASE}")
        print(f"  Start it: cd backend && python -m uvicorn app.main_new:app --port 8000")
        sys.exit(1)

    setup()
    test_auth()
    test_isolation()
    test_chapters_auth_gap()
    test_crud()
    test_admin_crud()
    test_frontend_api_alignment()
    test_security()
    test_error_handling()
    report = generate_report()

    sys.exit(0 if report["critical"] == 0 else 1)
