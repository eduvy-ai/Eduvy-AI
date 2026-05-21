"""
admin.py — Superadmin endpoints for curriculum management.

POST   /api/admin/login                    → admin login, return JWT
GET    /api/admin/me                       → verify admin token
GET    /api/admin/boards                   → list all boards (incl. inactive)
POST   /api/admin/boards                   → create board
PUT    /api/admin/boards/{id}              → update board
DELETE /api/admin/boards/{id}              → soft-delete board

GET    /api/admin/standards                → list all standards
POST   /api/admin/standards                → create standard
PUT    /api/admin/standards/{id}           → update standard
DELETE /api/admin/standards/{id}           → soft-delete standard

GET    /api/admin/mediums                  → list all mediums
POST   /api/admin/mediums                  → create medium
PUT    /api/admin/mediums/{id}             → update medium
DELETE /api/admin/mediums/{id}             → soft-delete medium

GET    /api/admin/curriculum               → list all curriculum rows
POST   /api/admin/curriculum               → add one row
PUT    /api/admin/curriculum/{id}          → update one row
DELETE /api/admin/curriculum/{id}          → delete one row
POST   /api/admin/curriculum/import        → bulk-import JSON array
POST   /api/admin/setup                    → create first superadmin (only if none exist)
"""
import json
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

from database import get_db

router = APIRouter()

_bearer = HTTPBearer(auto_error=False)
_JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
_ADMIN_JWT_DAYS = 7


# ── Helpers ──────────────────────────────────────────────────────

def _hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _make_admin_token(admin_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=_ADMIN_JWT_DAYS)
    return jwt.encode(
        {"sub": str(admin_id), "role": "admin", "exp": exp},
        _JWT_SECRET,
        algorithm=_JWT_ALGORITHM,
    )


def get_admin_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> int:
    if not creds:
        raise HTTPException(status_code=401, detail="Admin auth required")
    try:
        payload = jwt.decode(creds.credentials, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access only")
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(uid)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


# ── Request models ────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminSetupRequest(BaseModel):
    email: str
    password: str
    name: str = "SuperAdmin"


class BoardUpsert(BaseModel):
    id: str            # slug e.g. "cbse"
    name: str          # display e.g. "CBSE"
    sort_order: int = 0
    is_active: bool = True


class StandardUpsert(BaseModel):
    id: str            # slug e.g. "class-10"
    name: str          # display e.g. "Class 10"
    grade_num: int
    sort_order: int = 0
    is_active: bool = True


class MediumUpsert(BaseModel):
    id: str            # slug e.g. "english"
    name: str          # display e.g. "English"
    sort_order: int = 0
    is_active: bool = True


class CurriculumRow(BaseModel):
    board_id: str
    standard_id: str
    medium_id: str
    subjects: List[str]
    is_active: bool = True


class CurriculumUpdate(BaseModel):
    subjects: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ImportRow(BaseModel):
    board: str      # board name or id
    standard: str   # standard name or id
    medium: str     # medium name or id
    subjects: List[str]


# ── Auth endpoints ────────────────────────────────────────────────

@router.post("/admin/setup", status_code=201)
def admin_setup(data: AdminSetupRequest):
    """Create the first superadmin. Only works when no admin exists."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS cnt FROM admin_users")
        row = cur.fetchone()
        if row and row["cnt"] > 0:
            raise HTTPException(status_code=403, detail="Admin already exists. Use login.")
        email = data.email.strip().lower()
        if "@" not in email:
            raise HTTPException(status_code=422, detail="Valid email required")
        if len(data.password) < 8:
            raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
        pw_hash = _hash(data.password)
        cur.execute(
            "INSERT INTO admin_users (email, password_hash, name, role) VALUES (%s,%s,%s,'superadmin') RETURNING id",
            (email, pw_hash, data.name.strip()),
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
        token = _make_admin_token(new_id)
        return {"token": token, "email": email, "name": data.name.strip()}
    finally:
        conn.close()


@router.post("/admin/login")
def admin_login(data: AdminLoginRequest):
    conn = get_db()
    try:
        cur = conn.cursor()
        email = data.email.strip().lower()
        cur.execute("SELECT * FROM admin_users WHERE email = %s", (email,))
        admin = cur.fetchone()
        if not admin or not _verify(data.password, admin["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = _make_admin_token(admin["id"])
        return {"token": token, "email": admin["email"], "name": admin["name"]}
    finally:
        conn.close()


@router.get("/admin/me")
def admin_me(admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, email, name, role, created_at FROM admin_users WHERE id = %s", (admin_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin not found")
        return dict(row)
    finally:
        conn.close()


# ── Boards ────────────────────────────────────────────────────────

@router.get("/admin/boards")
def admin_list_boards(admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM boards ORDER BY sort_order, name")
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


@router.post("/admin/boards", status_code=201)
def admin_create_board(data: BoardUpsert, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO boards (id, name, sort_order, is_active)
               VALUES (%s,%s,%s,%s)
               ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
               sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
               RETURNING *""",
            (data.id.lower().strip(), data.name.strip(), data.sort_order, data.is_active),
        )
        row = cur.fetchone()
        conn.commit()
        return dict(row)
    finally:
        conn.close()


@router.put("/admin/boards/{board_id}")
def admin_update_board(board_id: str, data: BoardUpsert, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE boards SET name=%s, sort_order=%s, is_active=%s WHERE id=%s RETURNING *",
            (data.name.strip(), data.sort_order, data.is_active, board_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Board not found")
        conn.commit()
        return dict(row)
    finally:
        conn.close()


@router.delete("/admin/boards/{board_id}")
def admin_delete_board(board_id: str, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE boards SET is_active=FALSE WHERE id=%s", (board_id,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@router.post("/admin/boards/import")
def admin_import_boards(data: list, admin_id: int = Depends(get_admin_user)):
    inserted, updated, errors = 0, 0, []
    conn = get_db()
    try:
        cur = conn.cursor()
        for i, row in enumerate(data):
            try:
                bid   = str(row.get("id", "")).lower().strip()
                name  = str(row.get("name", "")).strip()
                order = int(row.get("sort_order", 0))
                active = bool(row.get("is_active", True))
                if not bid or not name:
                    errors.append({"row": i, "error": "id and name required"}); continue
                cur.execute("SELECT id FROM boards WHERE id=%s", (bid,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO boards (id, name, sort_order, is_active)
                       VALUES (%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (bid, name, order, active),
                )
                if exists: updated += 1
                else: inserted += 1
            except Exception as e:
                errors.append({"row": i, "error": str(e)})
        conn.commit()
    finally:
        conn.close()
    return {"inserted": inserted, "updated": updated, "errors": errors}


# ── Standards ─────────────────────────────────────────────────────

@router.get("/admin/standards")
def admin_list_standards(admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM standards ORDER BY grade_num")
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


@router.post("/admin/standards", status_code=201)
def admin_create_standard(data: StandardUpsert, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO standards (id, name, grade_num, sort_order, is_active)
               VALUES (%s,%s,%s,%s,%s)
               ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, grade_num=EXCLUDED.grade_num,
               sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
               RETURNING *""",
            (data.id.lower().strip(), data.name.strip(), data.grade_num, data.sort_order, data.is_active),
        )
        row = cur.fetchone()
        conn.commit()
        return dict(row)
    finally:
        conn.close()


@router.put("/admin/standards/{std_id}")
def admin_update_standard(std_id: str, data: StandardUpsert, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE standards SET name=%s, grade_num=%s, sort_order=%s, is_active=%s WHERE id=%s RETURNING *",
            (data.name.strip(), data.grade_num, data.sort_order, data.is_active, std_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Standard not found")
        conn.commit()
        return dict(row)
    finally:
        conn.close()


@router.delete("/admin/standards/{std_id}")
def admin_delete_standard(std_id: str, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE standards SET is_active=FALSE WHERE id=%s", (std_id,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@router.post("/admin/standards/import")
def admin_import_standards(data: list, admin_id: int = Depends(get_admin_user)):
    inserted, updated, errors = 0, 0, []
    conn = get_db()
    try:
        cur = conn.cursor()
        for i, row in enumerate(data):
            try:
                sid   = str(row.get("id", "")).lower().strip()
                name  = str(row.get("name", "")).strip()
                grade = int(row.get("grade_num", 0))
                order = int(row.get("sort_order", 0))
                active = bool(row.get("is_active", True))
                if not sid or not name:
                    errors.append({"row": i, "error": "id and name required"}); continue
                cur.execute("SELECT id FROM standards WHERE id=%s", (sid,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO standards (id, name, grade_num, sort_order, is_active)
                       VALUES (%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                       grade_num=EXCLUDED.grade_num, sort_order=EXCLUDED.sort_order,
                       is_active=EXCLUDED.is_active""",
                    (sid, name, grade, order, active),
                )
                if exists: updated += 1
                else: inserted += 1
            except Exception as e:
                errors.append({"row": i, "error": str(e)})
        conn.commit()
    finally:
        conn.close()
    return {"inserted": inserted, "updated": updated, "errors": errors}


# ── Mediums ───────────────────────────────────────────────────────

@router.get("/admin/mediums")
def admin_list_mediums(admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM mediums ORDER BY sort_order, name")
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


@router.post("/admin/mediums", status_code=201)
def admin_create_medium(data: MediumUpsert, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO mediums (id, name, sort_order, is_active)
               VALUES (%s,%s,%s,%s)
               ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
               sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
               RETURNING *""",
            (data.id.lower().strip(), data.name.strip(), data.sort_order, data.is_active),
        )
        row = cur.fetchone()
        conn.commit()
        return dict(row)
    finally:
        conn.close()


@router.put("/admin/mediums/{medium_id}")
def admin_update_medium(medium_id: str, data: MediumUpsert, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE mediums SET name=%s, sort_order=%s, is_active=%s WHERE id=%s RETURNING *",
            (data.name.strip(), data.sort_order, data.is_active, medium_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Medium not found")
        conn.commit()
        return dict(row)
    finally:
        conn.close()


@router.delete("/admin/mediums/{medium_id}")
def admin_delete_medium(medium_id: str, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE mediums SET is_active=FALSE WHERE id=%s", (medium_id,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@router.post("/admin/mediums/import")
def admin_import_mediums(data: list, admin_id: int = Depends(get_admin_user)):
    inserted, updated, errors = 0, 0, []
    conn = get_db()
    try:
        cur = conn.cursor()
        for i, row in enumerate(data):
            try:
                mid   = str(row.get("id", "")).lower().strip()
                name  = str(row.get("name", "")).strip()
                order = int(row.get("sort_order", 0))
                active = bool(row.get("is_active", True))
                if not mid or not name:
                    errors.append({"row": i, "error": "id and name required"}); continue
                cur.execute("SELECT id FROM mediums WHERE id=%s", (mid,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO mediums (id, name, sort_order, is_active)
                       VALUES (%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (mid, name, order, active),
                )
                if exists: updated += 1
                else: inserted += 1
            except Exception as e:
                errors.append({"row": i, "error": str(e)})
        conn.commit()
    finally:
        conn.close()
    return {"inserted": inserted, "updated": updated, "errors": errors}


# ── Curriculum CRUD ───────────────────────────────────────────────

@router.get("/admin/curriculum")
def admin_list_curriculum(admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT c.id, c.board_id, b.name AS board_name,
                      c.standard_id, s.name AS standard_name,
                      c.medium_id, m.name AS medium_name,
                      c.subjects, c.is_active, c.created_at, c.updated_at
               FROM curriculum c
               JOIN boards b ON b.id = c.board_id
               JOIN standards s ON s.id = c.standard_id
               JOIN mediums m ON m.id = c.medium_id
               ORDER BY b.sort_order, s.grade_num, m.sort_order"""
        )
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["subjects"] = json.loads(d["subjects"])
            except Exception:
                d["subjects"] = []
            result.append(d)
        return result
    finally:
        conn.close()


@router.post("/admin/curriculum", status_code=201)
def admin_create_curriculum(data: CurriculumRow, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        subjects_json = json.dumps(data.subjects)
        cur.execute(
            """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects, is_active)
               VALUES (%s,%s,%s,%s,%s)
               ON CONFLICT (board_id, standard_id, medium_id) DO UPDATE
               SET subjects=EXCLUDED.subjects, is_active=EXCLUDED.is_active,
                   updated_at=CURRENT_TIMESTAMP
               RETURNING id""",
            (data.board_id, data.standard_id, data.medium_id, subjects_json, data.is_active),
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
        return {"id": new_id, "ok": True}
    finally:
        conn.close()


@router.put("/admin/curriculum/{curriculum_id}")
def admin_update_curriculum(
    curriculum_id: int, data: CurriculumUpdate, admin_id: int = Depends(get_admin_user)
):
    conn = get_db()
    try:
        cur = conn.cursor()
        sets, vals = [], []
        if data.subjects is not None:
            sets.append("subjects=%s")
            vals.append(json.dumps(data.subjects))
        if data.is_active is not None:
            sets.append("is_active=%s")
            vals.append(data.is_active)
        if not sets:
            raise HTTPException(status_code=422, detail="Nothing to update")
        sets.append("updated_at=CURRENT_TIMESTAMP")
        vals.append(curriculum_id)
        cur.execute(
            f"UPDATE curriculum SET {', '.join(sets)} WHERE id=%s RETURNING id",
            vals,
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Curriculum entry not found")
        conn.commit()
        return {"id": row["id"], "ok": True}
    finally:
        conn.close()


@router.delete("/admin/curriculum/{curriculum_id}")
def admin_delete_curriculum(curriculum_id: int, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM curriculum WHERE id=%s", (curriculum_id,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ── Bulk import ───────────────────────────────────────────────────

@router.post("/admin/curriculum/import")
def admin_import_curriculum(rows: List[ImportRow], admin_id: int = Depends(get_admin_user)):
    """
    Bulk-import curriculum rows. Each row uses the board/standard/medium
    display name (or id slug). Boards/standards/mediums are auto-created if missing.
    Returns { inserted, updated, errors[] }.
    """
    conn = get_db()
    inserted = updated = 0
    errors = []
    try:
        cur = conn.cursor()

        def _ensure_board(name_or_id: str) -> str:
            slug = name_or_id.lower().strip().replace(" ", "-")
            cur.execute("SELECT id FROM boards WHERE id=%s OR LOWER(name)=%s LIMIT 1",
                        (slug, name_or_id.lower().strip()))
            row = cur.fetchone()
            if row:
                return row["id"]
            cur.execute(
                "INSERT INTO boards (id, name) VALUES (%s,%s) ON CONFLICT (id) DO NOTHING RETURNING id",
                (slug, name_or_id.strip()),
            )
            r = cur.fetchone()
            return r["id"] if r else slug

        def _ensure_standard(name_or_id: str) -> str:
            slug = name_or_id.lower().strip().replace(" ", "-")
            cur.execute("SELECT id FROM standards WHERE id=%s OR LOWER(name)=%s LIMIT 1",
                        (slug, name_or_id.lower().strip()))
            row = cur.fetchone()
            if row:
                return row["id"]
            # Parse grade number from e.g. "Class 10" → 10
            import re
            m = re.search(r"\d+", name_or_id)
            grade_num = int(m.group()) if m else 0
            cur.execute(
                "INSERT INTO standards (id, name, grade_num) VALUES (%s,%s,%s) ON CONFLICT (id) DO NOTHING RETURNING id",
                (slug, name_or_id.strip(), grade_num),
            )
            r = cur.fetchone()
            return r["id"] if r else slug

        def _ensure_medium(name_or_id: str) -> str:
            slug = name_or_id.lower().strip().replace(" ", "-")
            cur.execute("SELECT id FROM mediums WHERE id=%s OR LOWER(name)=%s LIMIT 1",
                        (slug, name_or_id.lower().strip()))
            row = cur.fetchone()
            if row:
                return row["id"]
            cur.execute(
                "INSERT INTO mediums (id, name) VALUES (%s,%s) ON CONFLICT (id) DO NOTHING RETURNING id",
                (slug, name_or_id.strip()),
            )
            r = cur.fetchone()
            return r["id"] if r else slug

        for idx, row in enumerate(rows):
            try:
                board_id    = _ensure_board(row.board)
                standard_id = _ensure_standard(row.standard)
                medium_id   = _ensure_medium(row.medium)
                subjects_json = json.dumps(row.subjects)

                cur.execute(
                    """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects)
                       VALUES (%s,%s,%s,%s)
                       ON CONFLICT (board_id, standard_id, medium_id)
                       DO UPDATE SET subjects=EXCLUDED.subjects, is_active=TRUE,
                                     updated_at=CURRENT_TIMESTAMP""",
                    (board_id, standard_id, medium_id, subjects_json),
                )
                if cur.rowcount == 1:
                    inserted += 1
                else:
                    updated += 1
            except Exception as e:
                errors.append({"row": idx, "error": str(e)})

        conn.commit()
        return {"inserted": inserted, "updated": updated, "errors": errors}
    finally:
        conn.close()


# ── User Management ───────────────────────────────────────────────

VALID_PLANS = {"free", "basic", "pro", "premium"}


class UserPlanUpdate(BaseModel):
    plan: str
    plan_expires_at: Optional[str] = ""  # ISO date string e.g. "2025-12-31", or "" for no expiry


@router.get("/admin/users")
def admin_list_users(
    search: Optional[str] = None,
    plan: Optional[str] = None,
    admin_id: int = Depends(get_admin_user),
):
    """List all student users with optional search and plan filter."""
    conn = get_db()
    try:
        cur = conn.cursor()
        query = """
            SELECT id, email, name, standard, board, language,
                   xp, streak, plan, plan_expires_at,
                   ai_provider, ai_model, ai_admin_override, created_at
            FROM users
            WHERE 1=1
        """
        params = []
        if search:
            query += " AND (LOWER(name) LIKE %s OR LOWER(email) LIKE %s)"
            like = f"%{search.lower()}%"
            params.extend([like, like])
        if plan and plan in VALID_PLANS:
            query += " AND plan = %s"
            params.append(plan)
        query += " ORDER BY created_at DESC LIMIT 500"
        cur.execute(query, params)
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


@router.get("/admin/users/{user_id}")
def admin_get_user(user_id: str, admin_id: int = Depends(get_admin_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT id, email, name, mobile, parent_mobile, standard, board,
                      language, subjects, xp, streak, plan, plan_expires_at, created_at
               FROM users WHERE id = %s""",
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        result = dict(row)
        if isinstance(result.get("subjects"), str):
            try:
                result["subjects"] = json.loads(result["subjects"])
            except Exception:
                result["subjects"] = []
        return result
    finally:
        conn.close()


@router.put("/admin/users/{user_id}/plan")
def admin_set_user_plan(user_id: str, data: UserPlanUpdate, admin_id: int = Depends(get_admin_user)):
    """Set a user's subscription plan (and optional expiry)."""
    if data.plan not in VALID_PLANS:
        raise HTTPException(status_code=422, detail=f"Plan must be one of: {', '.join(VALID_PLANS)}")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET plan=%s, plan_expires_at=%s WHERE id=%s RETURNING id, email, name, plan, plan_expires_at",
            (data.plan, data.plan_expires_at or "", user_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        conn.commit()
        return dict(row)
    finally:
        conn.close()


# ── AI Config Management ──────────────────────────────────────

VALID_PROVIDERS = {"gemini", "groq", "anthropic", "openai"}

PROVIDER_MODELS = {
    "gemini":    ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    "groq":      ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    "anthropic": ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
    "openai":    ["gpt-4o-mini", "gpt-4o"],
}


class PlanRoutingUpdate(BaseModel):
    plan: str
    provider: str
    model: str


class UserAIConfigUpdate(BaseModel):
    provider: str
    model: str
    override: bool = True   # False = remove override (reset to plan routing)


@router.get("/admin/ai-config")
def admin_get_ai_config(admin_id: int = Depends(get_admin_user)):
    """Return current plan routing config and key status (never actual key values)."""
    from services.ai_service import get_plan_routing, get_key_status, get_key_slot_status
    return {
        "routing":    get_plan_routing(),
        "providers":  PROVIDER_MODELS,
        "key_status": get_key_status(),      # {provider: bool} — no actual keys
        "key_slots":  get_key_slot_status(),  # {provider: {db_slots, env_count, pool_size}}
    }


class APIKeyUpdate(BaseModel):
    provider: str
    key: str
    slot: int = 1   # 1–5; slot 1 is the primary key


@router.put("/admin/ai-keys")
def admin_set_api_key(data: APIKeyUpdate, admin_id: int = Depends(get_admin_user)):
    """Save a provider API key to the DB (replaces env-var value in memory immediately)."""
    if data.provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=422, detail=f"Invalid provider. Must be one of: {', '.join(VALID_PROVIDERS)}")
    if not 1 <= data.slot <= 5:
        raise HTTPException(status_code=422, detail="Slot must be between 1 and 5")
    key = data.key.strip()
    if not key:
        raise HTTPException(status_code=422, detail="Key cannot be empty")
    # Basic format sanity checks (not exhaustive)
    if data.provider == "gemini" and not key.startswith("AIza"):
        raise HTTPException(status_code=422, detail="Gemini keys start with 'AIza'")
    if data.provider == "groq" and not key.startswith("gsk_"):
        raise HTTPException(status_code=422, detail="Groq keys start with 'gsk_'")
    if data.provider == "anthropic" and not key.startswith("sk-ant-"):
        raise HTTPException(status_code=422, detail="Anthropic keys start with 'sk-ant-'")
    if data.provider == "openai" and not key.startswith("sk-"):
        raise HTTPException(status_code=422, detail="OpenAI keys start with 'sk-'")
    from services.ai_service import save_api_key
    save_api_key(data.provider, key, slot=data.slot)
    return {"ok": True, "provider": data.provider, "slot": data.slot, "set": True}


@router.delete("/admin/ai-keys/{provider}/{slot}")
def admin_remove_api_key(provider: str, slot: int, admin_id: int = Depends(get_admin_user)):
    """Remove a specific key slot for a provider (DB only; env-var keys are unaffected)."""
    if provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=422, detail=f"Invalid provider. Must be one of: {', '.join(VALID_PROVIDERS)}")
    if not 1 <= slot <= 5:
        raise HTTPException(status_code=422, detail="Slot must be between 1 and 5")
    from services.ai_service import remove_api_key_slot
    remove_api_key_slot(provider, slot)
    return {"ok": True, "provider": provider, "slot": slot, "removed": True}


@router.put("/admin/ai-config")
def admin_set_plan_routing(data: PlanRoutingUpdate, admin_id: int = Depends(get_admin_user)):
    """Save a plan's provider+model routing to DB and reload in-memory cache."""
    if data.plan not in {"free", "basic", "pro", "premium"}:
        raise HTTPException(status_code=422, detail="Invalid plan")
    if data.provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=422, detail=f"Invalid provider. Must be one of: {', '.join(VALID_PROVIDERS)}")
    valid_models = PROVIDER_MODELS.get(data.provider, [])
    if data.model not in valid_models:
        raise HTTPException(status_code=422, detail=f"Invalid model for {data.provider}. Valid: {valid_models}")
    from services.ai_service import save_plan_routing
    save_plan_routing(data.plan, data.provider, data.model)
    return {"ok": True, "plan": data.plan, "provider": data.provider, "model": data.model}


@router.put("/admin/users/{user_id}/ai-config")
def admin_set_user_ai_config(
    user_id: str, data: UserAIConfigUpdate, admin_id: int = Depends(get_admin_user)
):
    """Set or clear the per-user AI provider+model admin override."""
    if data.override:
        if data.provider not in VALID_PROVIDERS:
            raise HTTPException(status_code=422, detail=f"Invalid provider. Must be one of: {', '.join(VALID_PROVIDERS)}")
        valid_models = PROVIDER_MODELS.get(data.provider, [])
        if data.model not in valid_models:
            raise HTTPException(status_code=422, detail=f"Invalid model for {data.provider}. Valid: {valid_models}")
    conn = get_db()
    try:
        cur = conn.cursor()
        if data.override:
            cur.execute(
                """UPDATE users SET ai_provider=%s, ai_model=%s, ai_admin_override=TRUE
                   WHERE id=%s RETURNING id, email, name, ai_provider, ai_model, ai_admin_override""",
                (data.provider, data.model, user_id),
            )
        else:
            # Reset to plan routing
            cur.execute(
                """UPDATE users SET ai_admin_override=FALSE
                   WHERE id=%s RETURNING id, email, name, ai_provider, ai_model, ai_admin_override""",
                (user_id,),
            )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        conn.commit()
        return dict(row)
    finally:
        conn.close()


# ── AI Usage Analytics ────────────────────────────────────────

@router.get("/admin/usage/summary")
def admin_usage_summary(
    days: int = 7,
    admin_id: int = Depends(get_admin_user),
):
    """
    Aggregate AI usage across all users for the last N days.
    Returns per-day totals + per-plan breakdown.
    """
    conn = get_db()
    try:
        cur = conn.cursor()
        # Per-day totals (last N days)
        cur.execute(
            """
            SELECT u.date,
                   SUM(u.call_count) AS calls,
                   SUM(u.prompt_tokens + u.completion_tokens) AS tokens
            FROM ai_usage u
            WHERE u.date >= (CURRENT_DATE - (%s - 1) * INTERVAL '1 day')::TEXT
            GROUP BY u.date
            ORDER BY u.date
            """,
            (days,),
        )
        daily = [dict(r) for r in cur.fetchall()]

        # Per-plan breakdown for the same window
        cur.execute(
            """
            SELECT p.plan,
                   SUM(u.call_count) AS calls,
                   SUM(u.prompt_tokens + u.completion_tokens) AS tokens,
                   COUNT(DISTINCT u.user_id) AS active_users
            FROM ai_usage u
            JOIN users p ON p.id = u.user_id
            WHERE u.date >= (CURRENT_DATE - (%s - 1) * INTERVAL '1 day')::TEXT
            GROUP BY p.plan
            ORDER BY p.plan
            """,
            (days,),
        )
        by_plan = [dict(r) for r in cur.fetchall()]

        # All-time totals
        cur.execute("SELECT SUM(call_count) AS calls, SUM(prompt_tokens+completion_tokens) AS tokens FROM ai_usage")
        totals = dict(cur.fetchone() or {})

        return {"daily": daily, "by_plan": by_plan, "all_time": totals, "days": days}
    finally:
        conn.close()


@router.get("/admin/usage/users")
def admin_usage_top_users(
    date: Optional[str] = None,
    admin_id: int = Depends(get_admin_user),
):
    """Usage per user for a specific date (default: today)."""
    from datetime import datetime, timezone
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT u.user_id, p.name, p.email, p.plan,
                   u.call_count, u.prompt_tokens, u.completion_tokens,
                   u.prompt_tokens + u.completion_tokens AS total_tokens
            FROM ai_usage u
            JOIN users p ON p.id = u.user_id
            WHERE u.date = %s
            ORDER BY u.call_count DESC
            LIMIT 200
            """,
            (target_date,),
        )
        return {"date": target_date, "rows": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()

