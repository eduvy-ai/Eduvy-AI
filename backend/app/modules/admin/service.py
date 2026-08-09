"""
Admin Service - Business logic for admin panel.
"""
import os
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from fastapi import HTTPException
from jose import jwt

from app.db.connection import get_db

_JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
_ADMIN_JWT_DAYS = 7


def _hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _normalize_role(role: str) -> str:
    """Normalize role name to snake_case."""
    # Convert legacy formats: superadmin -> super_admin
    role_map = {
        'superadmin': 'super_admin',
        'academicmanager': 'academic_manager',
        'contentmanager': 'content_manager',
        'aimanager': 'ai_manager',
    }
    return role_map.get(role, role)


def _make_admin_token(admin_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=_ADMIN_JWT_DAYS)
    return jwt.encode(
        {"sub": str(admin_id), "role": "admin", "exp": exp},
        _JWT_SECRET,
        algorithm=_JWT_ALGORITHM,
    )


class AdminService:
    """Admin panel business logic."""
    
    @staticmethod
    def setup(email: str, password: str, name: str) -> Dict:
        """Create first superadmin."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) AS cnt FROM admin_users")
            row = cur.fetchone()
            if row and row["cnt"] > 0:
                raise HTTPException(status_code=403, detail="Admin already exists. Use login.")
            
            email = email.strip().lower()
            if "@" not in email:
                raise HTTPException(status_code=422, detail="Valid email required")
            if len(password) < 8:
                raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
            
            pw_hash = _hash(password)
            cur.execute(
                "INSERT INTO admin_users (email, password_hash, name, role) VALUES (%s,%s,%s,'super_admin') RETURNING id, email, name, role, created_at",
                (email, pw_hash, name.strip())
            )
            new_admin = cur.fetchone()
            conn.commit()
            
            token = _make_admin_token(new_admin["id"])
            user = {
                "id": new_admin["id"],
                "email": new_admin["email"],
                "name": new_admin["name"],
                "role": _normalize_role(new_admin["role"]),
                "created_at": str(new_admin["created_at"]) if new_admin["created_at"] else None,
            }
            return {"token": token, "user": user}
        finally:
            conn.close()
    
    @staticmethod
    def login(email: str, password: str) -> Dict:
        """Admin login."""
        conn = get_db()
        try:
            cur = conn.cursor()
            email = email.strip().lower()
            cur.execute("SELECT id, email, name, role, created_at FROM admin_users WHERE email = %s", (email,))
            admin = cur.fetchone()
            if not admin:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Check password
            cur.execute("SELECT password_hash FROM admin_users WHERE id = %s", (admin["id"],))
            pw_row = cur.fetchone()
            if not pw_row or not _verify(password, pw_row["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            token = _make_admin_token(admin["id"])
            user = {
                "id": admin["id"],
                "email": admin["email"],
                "name": admin["name"],
                "role": _normalize_role(admin["role"]),
                "created_at": str(admin["created_at"]) if admin["created_at"] else None,
            }
            return {"token": token, "user": user}
        finally:
            conn.close()
    
    @staticmethod
    def get_me(admin_id: int) -> Dict:
        """Get admin profile."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, email, name, role, created_at FROM admin_users WHERE id = %s", (admin_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Admin not found")
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "role": _normalize_role(row["role"]),
                "created_at": str(row["created_at"]) if row["created_at"] else None,
            }
        finally:
            conn.close()
    
    # ── Boards ────────────────────────────────────────────────
    
    @staticmethod
    def list_boards() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM boards ORDER BY sort_order, name")
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def upsert_board(board_id: str, name: str, sort_order: int, is_active: bool) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO boards (id, name, sort_order, is_active)
                   VALUES (%s,%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                   sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (board_id.lower().strip(), name.strip(), sort_order, is_active)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()
    
    @staticmethod
    def delete_board(board_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            # Cascade: remove all curriculum rows that reference this board
            cur.execute("DELETE FROM curriculum WHERE board_id=%s", (board_id,))
            cur.execute("DELETE FROM boards WHERE id=%s", (board_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def import_boards(rows: List[Dict]) -> Dict:
        """Bulk upsert boards. Returns {inserted, updated}."""
        conn = get_db()
        try:
            cur = conn.cursor()
            inserted = 0
            updated = 0
            for row in rows:
                bid = str(row.get("id", "")).strip().lower()
                if not bid:
                    continue
                cur.execute("SELECT id FROM boards WHERE id=%s", (bid,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO boards (id, name, sort_order, is_active)
                       VALUES (%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (bid, str(row.get("name", "")).strip(),
                     int(row.get("sort_order", 0)), bool(row.get("is_active", True)))
                )
                if exists:
                    updated += 1
                else:
                    inserted += 1
            conn.commit()
            return {"inserted": inserted, "updated": updated}
        finally:
            conn.close()

    # ── Standards ─────────────────────────────────────────────
    
    @staticmethod
    def list_standards() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM standards ORDER BY grade_num")
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def upsert_standard(std_id: str, name: str, grade_num: int, sort_order: int, is_active: bool) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO standards (id, name, grade_num, sort_order, is_active)
                   VALUES (%s,%s,%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, grade_num=EXCLUDED.grade_num,
                   sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (std_id.lower().strip(), name.strip(), grade_num, sort_order, is_active)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()
    
    @staticmethod
    def delete_standard(std_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            # Cascade: remove all curriculum rows that reference this standard
            cur.execute("DELETE FROM curriculum WHERE standard_id=%s", (std_id,))
            cur.execute("DELETE FROM standards WHERE id=%s", (std_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()
    
    # ── Mediums ───────────────────────────────────────────────
    
    @staticmethod
    def list_mediums() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM mediums ORDER BY sort_order, name")
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def upsert_medium(med_id: str, name: str, sort_order: int, is_active: bool) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO mediums (id, name, sort_order, is_active)
                   VALUES (%s,%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                   sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (med_id.lower().strip(), name.strip(), sort_order, is_active)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()
    
    @staticmethod
    def delete_medium(med_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            # Cascade: remove all curriculum rows that reference this medium
            cur.execute("DELETE FROM curriculum WHERE medium_id=%s", (med_id,))
            cur.execute("DELETE FROM mediums WHERE id=%s", (med_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def import_standards(rows: List[Dict]) -> Dict:
        """Bulk upsert standards. Returns {inserted, updated}."""
        conn = get_db()
        try:
            cur = conn.cursor()
            inserted = 0
            updated = 0
            for row in rows:
                sid = str(row.get("id", "")).strip().lower()
                if not sid:
                    continue
                cur.execute("SELECT id FROM standards WHERE id=%s", (sid,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO standards (id, name, grade_num, sort_order, is_active)
                       VALUES (%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, grade_num=EXCLUDED.grade_num,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (sid, str(row.get("name", "")).strip(),
                     int(row.get("grade_num", 0)), int(row.get("sort_order", 0)),
                     bool(row.get("is_active", True)))
                )
                if exists:
                    updated += 1
                else:
                    inserted += 1
            conn.commit()
            return {"inserted": inserted, "updated": updated}
        finally:
            conn.close()

    @staticmethod
    def import_mediums(rows: List[Dict]) -> Dict:
        """Bulk upsert mediums. Returns {inserted, updated}."""
        conn = get_db()
        try:
            cur = conn.cursor()
            inserted = 0
            updated = 0
            for row in rows:
                mid = str(row.get("id", "")).strip().lower()
                if not mid:
                    continue
                cur.execute("SELECT id FROM mediums WHERE id=%s", (mid,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO mediums (id, name, sort_order, is_active)
                       VALUES (%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (mid, str(row.get("name", "")).strip(),
                     int(row.get("sort_order", 0)), bool(row.get("is_active", True)))
                )
                if exists:
                    updated += 1
                else:
                    inserted += 1
            conn.commit()
            return {"inserted": inserted, "updated": updated}
        finally:
            conn.close()

    # ── Subjects ──────────────────────────────────────────────

    @staticmethod
    def list_subjects(board_id: str = None, standard_id: str = None) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            query = """
                SELECT s.*, b.name as board_name, st.name as standard_name
                FROM subjects s
                LEFT JOIN boards b ON s.board_id = b.id
                LEFT JOIN standards st ON s.standard_id = st.id
                WHERE 1=1
            """
            params = []
            if board_id:
                query += " AND s.board_id = %s"
                params.append(board_id)
            if standard_id:
                query += " AND s.standard_id = %s"
                params.append(standard_id)
            query += " ORDER BY b.sort_order, st.sort_order, s.sort_order"
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def upsert_subject(subj_id: str, name: str, board_id: str, standard_id: str, sort_order: int = 0, is_active: bool = True) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO subjects (id, name, board_id, standard_id, sort_order, is_active)
                   VALUES (%s, %s, %s, %s, %s, %s)
                   ON CONFLICT (id) DO UPDATE SET
                   name=EXCLUDED.name, board_id=EXCLUDED.board_id, standard_id=EXCLUDED.standard_id,
                   sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (subj_id.lower().strip(), name.strip(), board_id, standard_id, sort_order, is_active)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def delete_subject(subj_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM subjects WHERE id=%s", (subj_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def import_subjects(rows: List[Dict]) -> Dict:
        """Bulk upsert subjects. Returns {inserted, updated}."""
        conn = get_db()
        try:
            cur = conn.cursor()
            inserted = 0
            updated = 0
            for row in rows:
                sid = str(row.get("id", "")).strip().lower()
                if not sid:
                    continue
                cur.execute("SELECT id FROM subjects WHERE id=%s", (sid,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO subjects (id, name, board_id, standard_id, sort_order, is_active)
                       VALUES (%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, board_id=EXCLUDED.board_id,
                       standard_id=EXCLUDED.standard_id, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (sid, str(row.get("name", "")).strip(),
                     str(row.get("board_id", "")).strip(),
                     str(row.get("standard_id", "")).strip(),
                     int(row.get("sort_order", 0)),
                     bool(row.get("is_active", True)))
                )
                if exists:
                    updated += 1
                else:
                    inserted += 1
            conn.commit()
            return {"inserted": inserted, "updated": updated}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_subjects(ids: List[str]) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM subjects WHERE id IN ({placeholders})", ids)
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted}
        finally:
            conn.close()

    # ── Curriculum (deprecated) ───────────────────────────────

    @staticmethod
    def list_curriculum() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT c.id, c.board_id, c.standard_id, c.medium_id, c.subjects, c.is_active,
                          b.name AS board_name, s.name AS standard_name, m.name AS medium_name
                   FROM curriculum c
                   LEFT JOIN boards b ON c.board_id = b.id
                   LEFT JOIN standards s ON c.standard_id = s.id
                   LEFT JOIN mediums m ON c.medium_id = m.id
                   ORDER BY c.board_id, c.standard_id, c.medium_id"""
            )
            rows = cur.fetchall()
            result = []
            for r in rows:
                d = dict(r)
                import json as _json
                try:
                    d["subjects"] = _json.loads(d["subjects"]) if isinstance(d["subjects"], str) else d["subjects"]
                except Exception:
                    d["subjects"] = []
                result.append(d)
            return result
        finally:
            conn.close()

    @staticmethod
    def create_curriculum(board_id: str, standard_id: str, medium_id: str, subjects: List[str], is_active: bool = True) -> Dict:
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects, is_active)
                   VALUES (%s,%s,%s,%s,%s)
                   ON CONFLICT (board_id, standard_id, medium_id)
                   DO UPDATE SET subjects=EXCLUDED.subjects, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (board_id, standard_id, medium_id, _json.dumps(subjects), is_active)
            )
            row = cur.fetchone()
            conn.commit()
            d = dict(row)
            try:
                d["subjects"] = _json.loads(d["subjects"]) if isinstance(d["subjects"], str) else d["subjects"]
            except Exception:
                d["subjects"] = []
            return d
        finally:
            conn.close()

    @staticmethod
    def update_curriculum(row_id: int, subjects: List[str] = None, is_active: bool = None) -> Dict:
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            if subjects is not None and is_active is not None:
                cur.execute(
                    "UPDATE curriculum SET subjects=%s, is_active=%s WHERE id=%s RETURNING *",
                    (_json.dumps(subjects), is_active, row_id)
                )
            elif subjects is not None:
                cur.execute(
                    "UPDATE curriculum SET subjects=%s WHERE id=%s RETURNING *",
                    (_json.dumps(subjects), row_id)
                )
            elif is_active is not None:
                cur.execute(
                    "UPDATE curriculum SET is_active=%s WHERE id=%s RETURNING *",
                    (is_active, row_id)
                )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Curriculum row not found")
            conn.commit()
            d = dict(row)
            try:
                d["subjects"] = _json.loads(d["subjects"]) if isinstance(d["subjects"], str) else d["subjects"]
            except Exception:
                d["subjects"] = []
            return d
        finally:
            conn.close()

    @staticmethod
    def delete_curriculum(row_id: int) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM curriculum WHERE id=%s", (row_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_standards(ids: List[str]) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM curriculum WHERE standard_id IN ({placeholders})", ids)
            cur.execute(f"DELETE FROM standards WHERE id IN ({placeholders})", ids)
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_boards(ids: List[str]) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM curriculum WHERE board_id IN ({placeholders})", ids)
            cur.execute(f"DELETE FROM boards WHERE id IN ({placeholders})", ids)
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_mediums(ids: List[str]) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM curriculum WHERE medium_id IN ({placeholders})", ids)
            cur.execute(f"DELETE FROM mediums WHERE id IN ({placeholders})", ids)
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_curriculum(ids: List[int]) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM curriculum WHERE id IN ({placeholders})", ids)
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def import_curriculum(rows: List[Dict]) -> Dict:
        import json as _json
        conn = get_db()
        created = 0
        errors = []
        try:
            cur = conn.cursor()
            for r in rows:
                try:
                    cur.execute(
                        """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects, is_active)
                           VALUES (%s,%s,%s,%s,TRUE)
                           ON CONFLICT (board_id, standard_id, medium_id)
                           DO UPDATE SET subjects=EXCLUDED.subjects, is_active=TRUE""",
                        (r["board_id"], r["standard_id"], r["medium_id"], _json.dumps(r.get("subjects", [])))
                    )
                    created += 1
                except Exception as e:
                    errors.append(str(e))
            conn.commit()
            return {"created": created, "errors": errors}
        finally:
            conn.close()

    # ── Users ─────────────────────────────────────────────────

    @staticmethod
    def list_users(search: str = "", plan: str = "", drishti_only: bool = False) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            conditions = []
            params = []
            if search:
                conditions.append("(LOWER(name) LIKE %s OR LOWER(email) LIKE %s)")
                like = f"%{search.lower()}%"
                params.extend([like, like])
            if plan:
                conditions.append("plan = %s")
                params.append(plan)
            if drishti_only:
                conditions.append("is_drishti = TRUE")
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            cur.execute(
                f"""SELECT id, name, email, standard, board, language, plan,
                           plan_expires_at, xp, streak, is_drishti,
                           ai_provider, ai_model, ai_admin_override, created_at
                    FROM users {where}
                    ORDER BY created_at DESC LIMIT 500""",
                params
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def update_user_plan(user_id: str, plan: str, plan_expires_at: str = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE users SET plan=%s, plan_expires_at=%s WHERE id=%s",
                (plan, plan_expires_at or "", user_id)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def toggle_drishti(user_id: str, is_drishti: bool) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE users SET is_drishti=%s WHERE id=%s", (is_drishti, user_id))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def update_user_ai_config(user_id: str, provider: str, model: str, override: bool) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE users SET ai_provider=%s, ai_model=%s, ai_admin_override=%s WHERE id=%s",
                (provider, model, override, user_id)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def create_drishti_student(name: str, email: str, password: str, standard: str, board: str, language: str) -> Dict:
        import uuid
        import bcrypt as _bcrypt
        conn = get_db()
        try:
            cur = conn.cursor()
            email = email.strip().lower()
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Email already registered")
            pw_hash = _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()
            user_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO users (id, name, email, password_hash, standard, board, language, is_drishti, plan)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,TRUE,'free')""",
                (user_id, name.strip(), email, pw_hash, standard, board, language)
            )
            conn.commit()
            return {"id": user_id, "name": name, "email": email}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_users(ids: List[str]) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM users WHERE id IN ({placeholders})", ids)
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    # ── API / Model Dashboard ──────────────────────────────────

    @staticmethod
    def get_api_dashboard(from_date: str = None, to_date: str = None) -> Dict:
        """Return live provider pool status, plan routing, and usage estimates for a date range."""
        from services.ai_service import _KEY_POOLS, _PLAN_ROUTING
        conn = get_db()
        try:
            cur = conn.cursor()
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            start_date = from_date if from_date else today
            end_date = to_date if to_date else today

            # Calls + tokens grouped by user plan for date range
            cur.execute(
                """SELECT u.plan,
                          COALESCE(SUM(a.call_count), 0)                        AS calls,
                          COALESCE(SUM(a.prompt_tokens + a.completion_tokens), 0) AS tokens
                   FROM ai_usage a
                   JOIN users u ON u.id = a.user_id
                   WHERE a.date >= %s AND a.date <= %s
                   GROUP BY u.plan""",
                (start_date, end_date),
            )
            plan_usage: dict = {r["plan"]: {"calls": int(r["calls"]), "tokens": int(r["tokens"])}
                                for r in cur.fetchall()}

            # Total users per plan
            cur.execute("SELECT plan, COUNT(*) AS cnt FROM users GROUP BY plan")
            plan_user_counts: dict = {r["plan"]: int(r["cnt"]) for r in cur.fetchall()}

            # Estimate provider call/token counts from plan routing
            provider_calls: dict = {}
            provider_tokens: dict = {}
            for plan, usage in plan_usage.items():
                routing = _PLAN_ROUTING.get(plan, {})
                prov = routing.get("provider", "groq")
                provider_calls[prov] = provider_calls.get(prov, 0) + usage["calls"]
                provider_tokens[prov] = provider_tokens.get(prov, 0) + usage["tokens"]

            # Known conservative free-tier daily REQUEST limits per key.
            # llama-3.3-70b-versatile: 1,000 RPD  (most plans use this)
            # llama-3.1-8b-instant:   14,400 RPD  (free plan fallback)
            FREE_LIMITS = {
                "groq":      1_000,    # conservative default (70b model limit)
                "gemini":    1_500,    # Gemini 2.0 Flash free tier
                "anthropic":     0,    # No free tier — paid only
                "openai":        0,    # No free tier — paid only
                "nvidia":       40,    # NIM API playground free tier
            }
            GROQ_MODEL_LIMITS = {
                "llama-3.1-8b-instant":    14_400,
                "llama-3.3-70b-versatile":  1_000,
                "llama-3.3-70b-specdec":    1_000,
                "llama-3.1-70b-versatile":  1_000,
            }
            PROVIDER_LABELS = {
                "groq":      "Groq",
                "gemini":    "Google Gemini",
                "anthropic": "Anthropic Claude",
                "openai":    "OpenAI GPT",
                "nvidia":    "NVIDIA NIM",
            }
            PROVIDER_ICONS = {
                "groq": "⚡", "gemini": "✦", "anthropic": "◈", "openai": "◎", "nvidia": "⬡"
            }

            providers = []
            for prov in ["groq", "gemini", "anthropic", "openai", "nvidia"]:
                pool_size      = len(_KEY_POOLS.get(prov, []))
                calls_today    = provider_calls.get(prov, 0)
                per_key_limit  = FREE_LIMITS[prov]
                # For Groq: use the active model’s actual RPD limit
                if prov == "groq":
                    active_groq_model = next(
                        (r["model"] for r in _PLAN_ROUTING.values() if r.get("provider") == "groq"),
                        "llama-3.3-70b-versatile"
                    )
                    per_key_limit = GROQ_MODEL_LIMITS.get(active_groq_model, FREE_LIMITS["groq"])
                # Total daily capacity = per-key limit × number of keys
                # Each key has its own independent quota from the provider.
                total_limit    = per_key_limit * pool_size if pool_size > 0 else per_key_limit
                used_pct       = round(calls_today / total_limit * 100) if total_limit else 0
                # Which model is this provider serving (first matching plan)
                active_model = next(
                    (r["model"] for r in _PLAN_ROUTING.values() if r.get("provider") == prov),
                    "—"
                )
                providers.append({
                    "id":            prov,
                    "label":         PROVIDER_LABELS[prov],
                    "icon":          PROVIDER_ICONS[prov],
                    "pool_size":     pool_size,
                    "has_key":       pool_size > 0,
                    "active_model":  active_model,
                    "calls_today":   calls_today,
                    "tokens_today":  provider_tokens.get(prov, 0),
                    "per_key_limit": per_key_limit,   # limit for a single key
                    "total_limit":   total_limit,     # per_key_limit × pool_size
                    "used_pct":      min(used_pct, 100),
                })

            # Per-plan routing + usage
            DEFAULT_ROUTING = {
                "free":    {"provider": "groq",   "model": "llama-3.1-8b-instant"},
                "basic":   {"provider": "groq",   "model": "llama-3.3-70b-versatile"},
                "pro":     {"provider": "gemini", "model": "gemini-2.0-flash"},
                "premium": {"provider": "gemini", "model": "gemini-2.0-flash"},
            }
            plans = []
            for plan in ["free", "basic", "pro", "premium"]:
                routing  = _PLAN_ROUTING.get(plan, DEFAULT_ROUTING[plan])
                usage    = plan_usage.get(plan, {"calls": 0, "tokens": 0})
                plans.append({
                    "plan":        plan,
                    "provider":    routing.get("provider", "groq"),
                    "model":       routing.get("model", "—"),
                    "user_count":  plan_user_counts.get(plan, 0),
                    "calls_today": usage["calls"],
                    "tokens_today": usage["tokens"],
                })

            total_calls  = sum(u["calls"]  for u in plan_usage.values())
            total_tokens = sum(u["tokens"] for u in plan_usage.values())

            return {
                "providers":          providers,
                "plans":              plans,
                "total_calls_today":  total_calls,
                "total_tokens_today": total_tokens,
                "as_of":              f"{start_date} to {end_date}" if start_date != end_date else start_date,
            }
        finally:
            conn.close()

    # ── AI Usage ──────────────────────────────────────────────

    @staticmethod
    def get_usage_summary(days: int = 7) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            # All-time totals with separate prompt/completion tokens
            cur.execute("""
                SELECT 
                    COALESCE(SUM(call_count), 0) AS total_calls,
                    COALESCE(SUM(prompt_tokens), 0) AS total_prompt_tokens,
                    COALESCE(SUM(completion_tokens), 0) AS total_completion_tokens
                FROM ai_usage
            """)
            row = cur.fetchone()
            total_calls = int(row["total_calls"])
            total_prompt_tokens = int(row["total_prompt_tokens"])
            total_completion_tokens = int(row["total_completion_tokens"])
            
            # Daily breakdown for past N days (fill in gaps with zeros)
            cur.execute(
                """SELECT date, 
                          SUM(call_count) AS calls, 
                          SUM(prompt_tokens) AS prompt_tokens,
                          SUM(completion_tokens) AS completion_tokens
                   FROM ai_usage
                   WHERE date::date >= CURRENT_DATE - (%s || ' days')::interval
                   GROUP BY date""",
                (days,)
            )
            usage_by_date = {r["date"]: {
                "calls": int(r["calls"]),
                "prompt_tokens": int(r["prompt_tokens"]),
                "completion_tokens": int(r["completion_tokens"]),
            } for r in cur.fetchall()}
            
            # Generate all dates in range and fill gaps with zeros
            from datetime import date, timedelta
            today = date.today()
            daily_breakdown = []
            for i in range(days - 1, -1, -1):  # oldest to newest
                d = (today - timedelta(days=i)).isoformat()
                if d in usage_by_date:
                    daily_breakdown.append({"date": d, **usage_by_date[d]})
                else:
                    daily_breakdown.append({
                        "date": d,
                        "calls": 0,
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                    })
            
            # Usage by plan
            cur.execute("""
                SELECT us.plan, 
                       COUNT(DISTINCT u.user_id) AS users,
                       SUM(u.call_count) AS calls
                FROM ai_usage u
                LEFT JOIN users us ON us.id = u.user_id
                WHERE u.date::date >= CURRENT_DATE - (%s || ' days')::interval
                GROUP BY us.plan
            """, (days,))
            by_plan = {}
            for r in cur.fetchall():
                plan = r["plan"] or "free"
                by_plan[plan] = {"users": int(r["users"]), "calls": int(r["calls"])}
            
            return {
                "total_calls": total_calls,
                "total_prompt_tokens": total_prompt_tokens,
                "total_completion_tokens": total_completion_tokens,
                "daily_breakdown": daily_breakdown,
                "by_plan": by_plan,
            }
        finally:
            conn.close()

    @staticmethod
    def get_usage_by_date(date: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT u.user_id, us.name, us.email, us.plan,
                          u.call_count,
                          u.prompt_tokens + u.completion_tokens AS total_tokens
                   FROM ai_usage u
                   LEFT JOIN users us ON us.id = u.user_id
                   WHERE u.date = %s
                   ORDER BY u.call_count DESC LIMIT 100""",
                (date,)
            )
            rows = [dict(r) for r in cur.fetchall()]
            return {"rows": rows}
        finally:
            conn.close()

    @staticmethod
    def get_usage_by_users(days: int = 7) -> List[Dict]:
        """Get aggregated AI usage per user for the past N days."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT u.user_id, 
                          us.name, 
                          us.email, 
                          us.plan,
                          SUM(u.call_count) AS calls,
                          SUM(u.prompt_tokens) AS prompt_tokens,
                          SUM(u.completion_tokens) AS completion_tokens
                   FROM ai_usage u
                   LEFT JOIN users us ON us.id = u.user_id
                   WHERE u.date::date >= CURRENT_DATE - (%s || ' days')::interval
                   GROUP BY u.user_id, us.name, us.email, us.plan
                   ORDER BY SUM(u.call_count) DESC 
                   LIMIT 100""",
                (days,)
            )
            return [{
                "user_id": r["user_id"],
                "name": r["name"] or "Unknown",
                "email": r["email"] or "",
                "plan": r["plan"] or "free",
                "calls": int(r["calls"]),
                "prompt_tokens": int(r["prompt_tokens"]),
                "completion_tokens": int(r["completion_tokens"]),
            } for r in cur.fetchall()]
        finally:
            conn.close()

    # ── AI Config ─────────────────────────────────────────────

    @staticmethod
    def get_ai_config() -> Dict:
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            # Routing
            cur.execute("SELECT key, value FROM app_settings WHERE key LIKE 'ai_routing_%'")
            routing = {}
            for r in cur.fetchall():
                plan = r["key"].replace("ai_routing_", "")
                try:
                    routing[plan] = _json.loads(r["value"])
                except Exception:
                    pass
            default_routing = {
                "free":    {"provider": "groq",   "model": "llama-3.1-8b-instant"},
                "basic":   {"provider": "groq",   "model": "llama-3.3-70b-versatile"},
                "pro":     {"provider": "gemini", "model": "gemini-2.0-flash"},
                "premium": {"provider": "gemini", "model": "gemini-2.0-flash"},
            }
            for plan, val in default_routing.items():
                if plan not in routing:
                    routing[plan] = val
            # Key status and slots
            providers = ["gemini", "groq", "anthropic", "openai", "nvidia"]
            key_status = {}
            key_slots = {}
            def mask_key(k: str) -> str:
                """Return masked hint like 'sk-••••abc' for UI display"""
                if not k or len(k) < 8:
                    return "••••••••"
                return k[:4] + "••••" + k[-4:]

            for prov in providers:
                has_key = False
                db_slots = {}
                db_hints = {}
                for slot in range(1, 6):
                    dk = f"api_key_{prov}" if slot == 1 else f"api_key_{prov}_{slot}"
                    cur.execute("SELECT value FROM app_settings WHERE key=%s AND value != ''", (dk,))
                    row = cur.fetchone()
                    key_val = row["value"] if row else ""
                    db_slots[slot] = bool(key_val)
                    db_hints[slot] = mask_key(key_val) if key_val else ""
                    if key_val:
                        has_key = True
                # Also check env vars
                env_base = {"gemini": "GEMINI_API_KEY", "groq": "GROQ_API_KEY",
                            "anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY",
                            "nvidia": "NVIDIA_API_KEY"}.get(prov, "")
                import os as _os
                env_count = sum(1 for i in ([""] + [f"_{j}" for j in range(2, 6)])
                                if _os.getenv(f"{env_base}{i}", ""))
                if env_count:
                    has_key = True
                key_status[prov] = has_key
                key_slots[prov] = {
                    "db_slots": db_slots,  # {1: bool, 2: bool, ...}
                    "db_hints": db_hints,  # {1: "sk-••••abc", 2: "", ...}
                    "env_count": env_count,
                    "pool_size": sum(1 for v in db_slots.values() if v) + env_count,
                }
            return {"routing": routing, "key_status": key_status, "key_slots": key_slots}
        finally:
            conn.close()

    @staticmethod
    def save_ai_routing(plan: str, provider: str, model: str) -> Dict:
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO app_settings (key, value, updated_at)
                   VALUES (%s, %s, CURRENT_TIMESTAMP)
                   ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP""",
                (f"ai_routing_{plan}", _json.dumps({"provider": provider, "model": model}))
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def save_ai_key(provider: str, key: str, slot: int = 1) -> Dict:
        import hashlib, base64
        from cryptography.fernet import Fernet
        import os as _os
        secret = _os.getenv("JWT_SECRET", "")
        fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest()))
        encrypted = fernet.encrypt(key.encode()).decode()
        db_key = f"api_key_{provider}" if slot == 1 else f"api_key_{provider}_{slot}"
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO app_settings (key, value, updated_at)
                   VALUES (%s, %s, CURRENT_TIMESTAMP)
                   ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP""",
                (db_key, encrypted)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def remove_ai_key(provider: str, slot: int) -> Dict:
        db_key = f"api_key_{provider}" if slot == 1 else f"api_key_{provider}_{slot}"
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM app_settings WHERE key=%s", (db_key,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    async def fetch_provider_models(provider: str) -> List[str]:
        """
        Fetch the live model list from the provider's API using the configured key.
        Falls back to a safe static list if the call fails or no key is set.
        Returns a list of model id strings.
        """
        import httpx as _httpx
        from services.ai_service import _next_key

        # Static fallback per provider (used when key missing or API down)
        _FALLBACK: Dict[str, List[str]] = {
            "groq":      ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
            "gemini":    ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
            "anthropic": ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
            "openai":    ["gpt-4o-mini", "gpt-4o"],
            "nvidia":    [
                "meta/llama-3.3-70b-instruct",
                "meta/llama-3.1-8b-instruct",
                "nvidia/llama-3.3-nemotron-super-49b-v1",
                "nvidia/llama-3.1-nemotron-ultra-253b-v1",
                "mistralai/mistral-nemotron",
                "deepseek-ai/deepseek-v4-flash",
            ],
        }

        key = _next_key(provider)
        if not key:
            return _FALLBACK.get(provider, [])

        try:
            async with _httpx.AsyncClient(timeout=10.0) as client:
                if provider == "groq":
                    r = await client.get(
                        "https://api.groq.com/openai/v1/models",
                        headers={"Authorization": f"Bearer {key}"},
                    )
                    r.raise_for_status()
                    data = r.json()
                    ids = [m["id"] for m in data.get("data", []) if m.get("id")]
                    # Only keep chat-capable models (filter out whisper, tts, etc.)
                    ids = [m for m in ids if "whisper" not in m and "tts" not in m
                           and "guard" not in m and "embed" not in m]
                    return sorted(ids) or _FALLBACK.get(provider, [])

                elif provider == "openai":
                    r = await client.get(
                        "https://api.openai.com/v1/models",
                        headers={"Authorization": f"Bearer {key}"},
                    )
                    r.raise_for_status()
                    data = r.json()
                    # Keep only GPT / o-series chat models
                    ids = [m["id"] for m in data.get("data", [])
                           if m.get("id") and (
                               m["id"].startswith("gpt-") or m["id"].startswith("o1") or m["id"].startswith("o3")
                           )]
                    return sorted(ids) or _FALLBACK.get(provider, [])

                elif provider == "gemini":
                    r = await client.get(
                        f"https://generativelanguage.googleapis.com/v1beta/models?key={key}",
                    )
                    r.raise_for_status()
                    data = r.json()
                    ids = []
                    for m in data.get("models", []):
                        name = m.get("name", "")          # "models/gemini-2.0-flash"
                        methods = m.get("supportedGenerationMethods", [])
                        if "generateContent" in methods:
                            ids.append(name.replace("models/", ""))
                    return sorted(ids) or _FALLBACK.get(provider, [])

                elif provider == "nvidia":
                    r = await client.get(
                        "https://integrate.api.nvidia.com/v1/models",
                        headers={"Authorization": f"Bearer {key}"},
                    )
                    r.raise_for_status()
                    data = r.json()
                    ids = [m["id"] for m in data.get("data", []) if m.get("id")]
                    # Filter to chat-capable models only (skip embedding/rerank/image)
                    ids = [m for m in ids if not any(
                        kw in m for kw in ["embed", "rerank", "vision", "vlm", "clip",
                                           "safety", "guard", "pii", "translate"]
                    )]
                    return sorted(ids) or _FALLBACK.get(provider, [])

                elif provider == "anthropic":
                    # Anthropic has no public /models listing — return curated list
                    return _FALLBACK.get(provider, [])

        except Exception:
            pass  # network error / bad key — return fallback silently

        return _FALLBACK.get(provider, [])

    # ── Drishti Helpers ───────────────────────────────────────

    @staticmethod
    def list_helpers() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT h.id, h.helper_name, h.helper_email, h.helper_type,
                       h.notes, h.is_active, h.created_at,
                       LEFT(h.helper_token, 8) AS token_preview,
                       COUNT(da.id) FILTER (WHERE da.is_active = TRUE) AS student_count
                FROM drishti_helpers h
                LEFT JOIN drishti_assignments da ON da.helper_id = h.id
                GROUP BY h.id
                ORDER BY h.created_at DESC
            """)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def create_helper(helper_name: str, helper_email: str, helper_type: str, notes: str) -> Dict:
        import secrets
        conn = get_db()
        try:
            cur = conn.cursor()
            email = helper_email.strip().lower()
            token = secrets.token_urlsafe(32)
            cur.execute(
                """INSERT INTO drishti_helpers (helper_name, helper_email, helper_type, helper_token, notes)
                   VALUES (%s,%s,%s,%s,%s) RETURNING id, helper_name, helper_email, helper_type, notes, is_active, created_at""",
                (helper_name.strip(), email, helper_type.strip(), token, notes.strip())
            )
            row = cur.fetchone()
            conn.commit()
            d = dict(row)
            d["helper_token"] = token
            return d
        finally:
            conn.close()

    @staticmethod
    def update_helper(helper_id: int, helper_name: str, helper_email: str, helper_type: str, notes: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """UPDATE drishti_helpers
                   SET helper_name=%s, helper_email=%s, helper_type=%s, notes=%s
                   WHERE id=%s RETURNING id, helper_name, helper_email, helper_type, notes, is_active""",
                (helper_name.strip(), helper_email.strip().lower(), helper_type.strip(), notes.strip(), helper_id)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Helper not found")
            conn.commit()
            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def deactivate_helper(helper_id: int) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE drishti_helpers SET is_active=FALSE WHERE id=%s", (helper_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def delete_helper_permanent(helper_id: int) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM helper_notes WHERE helper_id=%s", (helper_id,))
            cur.execute("DELETE FROM drishti_assignments WHERE helper_id=%s", (helper_id,))
            cur.execute("DELETE FROM drishti_helpers WHERE id=%s", (helper_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_helpers(ids: list) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM helper_notes WHERE helper_id = ANY(%s)", (ids,))
            cur.execute("DELETE FROM drishti_assignments WHERE helper_id = ANY(%s)", (ids,))
            cur.execute("DELETE FROM drishti_helpers WHERE id = ANY(%s)", (ids,))
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def get_helper_students(helper_id: int) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT u.id, u.name, u.standard, u.board, u.language, u.plan, u.xp, u.streak
                FROM users u
                JOIN drishti_assignments da ON da.student_id = u.id
                WHERE da.helper_id = %s AND da.is_active = TRUE
                ORDER BY u.name
            """, (helper_id,))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def assign_student(helper_id: int, student_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO drishti_assignments (helper_id, student_id, is_active)
                   VALUES (%s,%s,TRUE)
                   ON CONFLICT (helper_id, student_id)
                   DO UPDATE SET is_active=TRUE, assigned_at=CURRENT_TIMESTAMP""",
                (helper_id, student_id)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def unassign_student(helper_id: int, student_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE drishti_assignments SET is_active=FALSE WHERE helper_id=%s AND student_id=%s",
                (helper_id, student_id)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def list_drishti_students() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT u.id, u.name, u.standard, u.board, u.language, u.plan, u.xp, u.streak,
                       h.helper_name AS assigned_to
                FROM users u
                LEFT JOIN drishti_assignments da ON da.student_id = u.id AND da.is_active = TRUE
                LEFT JOIN drishti_helpers h ON h.id = da.helper_id
                WHERE u.is_drishti = TRUE
                ORDER BY u.name
            """)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    # ── Community / Squads ────────────────────────────────────

    @staticmethod
    def list_squads() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT s.id, s.name, s.focus_subject, s.standard, s.medium, s.is_active, s.created_at,
                       COUNT(DISTINCT sm.user_id) AS member_count,
                       COUNT(DISTINCT msg.id) AS message_count,
                       COUNT(DISTINCT d.id) AS doubt_count
                FROM squads s
                LEFT JOIN squad_members sm ON sm.squad_id = s.id
                LEFT JOIN squad_messages msg ON msg.squad_id = s.id
                LEFT JOIN squad_doubts d ON d.squad_id = s.id
                GROUP BY s.id
                ORDER BY s.created_at DESC
            """)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def get_squad(squad_id: int) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT s.id, s.name, s.focus_subject, s.standard, s.medium, s.is_active, s.created_at,
                       COUNT(DISTINCT sm.user_id) AS member_count
                FROM squads s
                LEFT JOIN squad_members sm ON sm.squad_id = s.id
                WHERE s.id = %s
                GROUP BY s.id
            """, (squad_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Squad not found")
            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def create_squad(name: str, focus_subject: str, standard: str, medium: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO squads (name, focus_subject, standard, medium, is_active)
                   VALUES (%s, %s, %s, %s, TRUE) RETURNING *""",
                (name.strip(), focus_subject.strip(), standard.strip(), medium.strip())
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def update_squad(squad_id: int, name: str = None, focus_subject: str = None, 
                     standard: str = None, medium: str = None, is_active: bool = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            updates = []
            params = []
            if name is not None:
                updates.append("name = %s")
                params.append(name.strip())
            if focus_subject is not None:
                updates.append("focus_subject = %s")
                params.append(focus_subject.strip())
            if standard is not None:
                updates.append("standard = %s")
                params.append(standard.strip())
            if medium is not None:
                updates.append("medium = %s")
                params.append(medium.strip())
            if is_active is not None:
                updates.append("is_active = %s")
                params.append(is_active)
            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")
            params.append(squad_id)
            cur.execute(f"UPDATE squads SET {', '.join(updates)} WHERE id = %s RETURNING *", params)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Squad not found")
            conn.commit()
            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def delete_squad(squad_id: int) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            # CASCADE will delete members, messages, doubts, answers
            cur.execute("DELETE FROM squads WHERE id = %s", (squad_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_squads(ids: list) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM squads WHERE id = ANY(%s)", (ids,))
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def get_squad_members(squad_id: int) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT sm.user_id, sm.role, sm.joined_at, sm.last_seen_at,
                       u.name, u.standard, u.board, u.xp, u.streak
                FROM squad_members sm
                JOIN users u ON u.id = sm.user_id
                WHERE sm.squad_id = %s
                ORDER BY sm.joined_at DESC
            """, (squad_id,))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def remove_squad_member(squad_id: int, user_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM squad_members WHERE squad_id = %s AND user_id = %s", (squad_id, user_id))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def get_squad_messages(squad_id: int, limit: int = 100) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, user_id, display_name, content, msg_type, created_at
                FROM squad_messages
                WHERE squad_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (squad_id, limit))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def delete_squad_message(message_id: int) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM squad_messages WHERE id = %s", (message_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def get_squad_doubts(squad_id: int = None, limit: int = 100) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            if squad_id:
                cur.execute("""
                    SELECT d.id, d.squad_id, d.user_id, d.display_name, d.subject, d.question, d.created_at,
                           s.name AS squad_name,
                           COUNT(a.id) AS answer_count
                    FROM squad_doubts d
                    LEFT JOIN squads s ON s.id = d.squad_id
                    LEFT JOIN squad_doubt_answers a ON a.doubt_id = d.id
                    WHERE d.squad_id = %s
                    GROUP BY d.id, s.name
                    ORDER BY d.created_at DESC
                    LIMIT %s
                """, (squad_id, limit))
            else:
                cur.execute("""
                    SELECT d.id, d.squad_id, d.user_id, d.display_name, d.subject, d.question, d.created_at,
                           s.name AS squad_name,
                           COUNT(a.id) AS answer_count
                    FROM squad_doubts d
                    LEFT JOIN squads s ON s.id = d.squad_id
                    LEFT JOIN squad_doubt_answers a ON a.doubt_id = d.id
                    GROUP BY d.id, s.name
                    ORDER BY d.created_at DESC
                    LIMIT %s
                """, (limit,))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def delete_squad_doubt(doubt_id: int) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            # CASCADE will delete answers
            cur.execute("DELETE FROM squad_doubts WHERE id = %s", (doubt_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_doubts(ids: list) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM squad_doubts WHERE id = ANY(%s)", (ids,))
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def get_community_stats() -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) AS total FROM squads WHERE is_active = TRUE")
            active_squads = cur.fetchone()["total"]
            cur.execute("SELECT COUNT(DISTINCT user_id) AS total FROM squad_members")
            total_members = cur.fetchone()["total"]
            cur.execute("SELECT COUNT(*) AS total FROM squad_messages WHERE created_at > CURRENT_DATE - INTERVAL '7 days'")
            messages_week = cur.fetchone()["total"]
            cur.execute("SELECT COUNT(*) AS total FROM squad_doubts WHERE created_at > CURRENT_DATE - INTERVAL '7 days'")
            doubts_week = cur.fetchone()["total"]
            return {
                "active_squads": active_squads,
                "total_members": total_members,
                "messages_this_week": messages_week,
                "doubts_this_week": doubts_week,
            }
        finally:
            conn.close()

    # ── Analytics ─────────────────────────────────────────────

    @staticmethod
    def get_analytics_overview() -> Dict:
        """Get high-level platform analytics."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Total users
            cur.execute("SELECT COUNT(*) AS total FROM users")
            total_users = cur.fetchone()["total"]
            
            # Active today (handle empty last_active)
            cur.execute("""
                SELECT COUNT(*) AS total FROM users 
                WHERE last_active != '' AND last_active::date = CURRENT_DATE
            """)
            active_today = cur.fetchone()["total"]
            
            # Active this week
            cur.execute("""
                SELECT COUNT(*) AS total FROM users 
                WHERE last_active != '' AND last_active::date > CURRENT_DATE - INTERVAL '7 days'
            """)
            active_7d = cur.fetchone()["total"]
            
            # Active this month
            cur.execute("""
                SELECT COUNT(*) AS total FROM users 
                WHERE last_active != '' AND last_active::date > CURRENT_DATE - INTERVAL '30 days'
            """)
            active_30d = cur.fetchone()["total"]
            
            # Signups today (handle empty created_at)
            cur.execute("""
                SELECT COUNT(*) AS total FROM users 
                WHERE created_at != '' AND created_at::date = CURRENT_DATE
            """)
            signups_today = cur.fetchone()["total"]
            
            # Signups this week
            cur.execute("""
                SELECT COUNT(*) AS total FROM users 
                WHERE created_at != '' AND created_at::date > CURRENT_DATE - INTERVAL '7 days'
            """)
            signups_7d = cur.fetchone()["total"]
            
            # Total AI calls today
            cur.execute("SELECT COALESCE(SUM(call_count), 0) AS total FROM ai_usage WHERE date = CURRENT_DATE::text")
            ai_calls_today = cur.fetchone()["total"]
            
            # Total AI calls this week
            cur.execute("""
                SELECT COALESCE(SUM(call_count), 0) AS total FROM ai_usage 
                WHERE date != '' AND date::date > CURRENT_DATE - INTERVAL '7 days'
            """)
            ai_calls_7d = cur.fetchone()["total"]
            
            # Paid subscriptions
            cur.execute("SELECT COUNT(*) AS total FROM users WHERE plan != 'free' AND (plan_expires_at = '' OR plan_expires_at > CURRENT_DATE::text)")
            paid_subs = cur.fetchone()["total"]
            
            # Users by plan
            cur.execute("SELECT plan, COUNT(*) AS count FROM users GROUP BY plan")
            by_plan = {r["plan"]: r["count"] for r in cur.fetchall()}
            
            # Average streak
            cur.execute("SELECT COALESCE(AVG(streak), 0) AS avg FROM users")
            avg_streak = round(cur.fetchone()["avg"], 1)
            
            # Total XP
            cur.execute("SELECT COALESCE(SUM(xp), 0) AS total FROM users")
            total_xp = cur.fetchone()["total"]
            
            return {
                "total_users": total_users,
                "active_today": active_today,
                "active_7d": active_7d,
                "active_30d": active_30d,
                "signups_today": signups_today,
                "signups_7d": signups_7d,
                "ai_calls_today": ai_calls_today,
                "ai_calls_7d": ai_calls_7d,
                "paid_subscriptions": paid_subs,
                "by_plan": by_plan,
                "avg_streak": avg_streak,
                "total_xp": total_xp,
            }
        finally:
            conn.close()

    @staticmethod
    def get_analytics_students() -> Dict:
        """Get detailed student analytics."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # By board
            cur.execute("SELECT board, COUNT(*) AS count FROM users GROUP BY board ORDER BY count DESC")
            by_board = {r["board"]: r["count"] for r in cur.fetchall()}
            
            # By standard
            cur.execute("SELECT standard, COUNT(*) AS count FROM users GROUP BY standard ORDER BY count DESC")
            by_standard = {r["standard"]: r["count"] for r in cur.fetchall()}
            
            # By language/medium
            cur.execute("SELECT language, COUNT(*) AS count FROM users GROUP BY language ORDER BY count DESC")
            by_language = {r["language"]: r["count"] for r in cur.fetchall()}
            
            # By school (top 20)
            cur.execute("""
                SELECT school, COUNT(*) AS count 
                FROM users 
                WHERE school != '' AND school IS NOT NULL
                GROUP BY school 
                ORDER BY count DESC 
                LIMIT 20
            """)
            by_school = [{"school": r["school"], "count": r["count"]} for r in cur.fetchall()]
            
            # Drishti students
            cur.execute("SELECT COUNT(*) AS total FROM users WHERE is_drishti = TRUE")
            drishti_count = cur.fetchone()["total"]
            
            # Top 10 by XP
            cur.execute("""
                SELECT id, name, xp, streak, plan, standard, board
                FROM users
                ORDER BY xp DESC
                LIMIT 10
            """)
            top_by_xp = [dict(r) for r in cur.fetchall()]
            
            # Top 10 by streak
            cur.execute("""
                SELECT id, name, xp, streak, plan, standard, board
                FROM users
                ORDER BY streak DESC
                LIMIT 10
            """)
            top_by_streak = [dict(r) for r in cur.fetchall()]
            
            # Growth chart (last 30 days)
            cur.execute("""
                SELECT created_at::date AS date, COUNT(*) AS count
                FROM users
                WHERE created_at != '' AND created_at::date > CURRENT_DATE - INTERVAL '30 days'
                GROUP BY created_at::date
                ORDER BY date
            """)
            growth_chart = [{"date": str(r["date"]), "count": r["count"]} for r in cur.fetchall()]
            
            # Activity chart (last 30 days)
            cur.execute("""
                SELECT last_active::date AS date, COUNT(*) AS count
                FROM users
                WHERE last_active != '' AND last_active::date > CURRENT_DATE - INTERVAL '30 days'
                GROUP BY last_active::date
                ORDER BY date
            """)
            activity_chart = [{"date": str(r["date"]), "count": r["count"]} for r in cur.fetchall()]
            
            return {
                "by_board": by_board,
                "by_standard": by_standard,
                "by_language": by_language,
                "by_school": by_school,
                "drishti_count": drishti_count,
                "top_by_xp": top_by_xp,
                "top_by_streak": top_by_streak,
                "growth_chart": growth_chart,
                "activity_chart": activity_chart,
            }
        finally:
            conn.close()

    @staticmethod
    def get_analytics_revenue() -> Dict:
        """Get revenue/subscription analytics."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Subscriptions by plan (excluding free)
            cur.execute("""
                SELECT plan, COUNT(*) AS count
                FROM users
                WHERE plan != 'free'
                GROUP BY plan
            """)
            subs_by_plan = {r["plan"]: r["count"] for r in cur.fetchall()}
            
            # Expired subscriptions
            cur.execute("""
                SELECT COUNT(*) AS total
                FROM users
                WHERE plan != 'free' AND plan_expires_at != '' AND plan_expires_at < CURRENT_DATE::text
            """)
            expired_subs = cur.fetchone()["total"]
            
            # Expiring soon (next 7 days)
            cur.execute("""
                SELECT COUNT(*) AS total
                FROM users
                WHERE plan != 'free' 
                  AND plan_expires_at != ''
                  AND plan_expires_at >= CURRENT_DATE::text
                  AND plan_expires_at <= (CURRENT_DATE + INTERVAL '7 days')::text
            """)
            expiring_soon = cur.fetchone()["total"]
            
            # Estimated MRR (Monthly Recurring Revenue)
            # Prices: basic=$5, pro=$15, premium=$30
            plan_prices = {"basic": 5, "pro": 15, "premium": 30}
            estimated_mrr = sum(
                subs_by_plan.get(plan, 0) * price 
                for plan, price in plan_prices.items()
            )
            
            return {
                "subscriptions_by_plan": subs_by_plan,
                "expired_subscriptions": expired_subs,
                "expiring_soon": expiring_soon,
                "estimated_mrr": estimated_mrr,
            }
        finally:
            conn.close()

