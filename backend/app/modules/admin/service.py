"""
Admin Service - Business logic for admin panel.
"""
import json
import os
import bcrypt
import asyncio
import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi import HTTPException
from jose import jwt

from app.db.connection import get_db

_JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
_ADMIN_JWT_DAYS = 7
logger = logging.getLogger(__name__)


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


def _make_admin_token(admin_id: int, school_id: int = None) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=_ADMIN_JWT_DAYS)
    payload = {"sub": str(admin_id), "role": "admin", "exp": exp}
    if school_id:
        payload["school_id"] = school_id
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGORITHM)


def _run_async_in_background(coro, task_name: str) -> None:
    """Run an async coroutine in a daemon thread without blocking the request path."""
    def _runner() -> None:
        try:
            asyncio.run(coro)
        except Exception as exc:
            logger.warning("Background task '%s' failed: %s", task_name, exc)

    thread = threading.Thread(target=_runner, name=f"admin-{task_name}", daemon=True)
    thread.start()


async def _send_student_welcome_email(
    student_name: str,
    student_email: str,
    temp_password: str,
    school_name: Optional[str],
) -> None:
    from app.utils.email import send_email, student_welcome_html, student_welcome_plain

    html = student_welcome_html(
        student_name=student_name,
        student_email=student_email,
        temp_password=temp_password,
        school_name=school_name,
    )
    plain = student_welcome_plain(
        student_name=student_name,
        student_email=student_email,
        temp_password=temp_password,
        school_name=school_name,
    )
    ok = await send_email(
        to_email=student_email,
        subject="Welcome to Eduvy-AI! 🎓",
        html_body=html,
        plain_body=plain,
    )
    if not ok:
        logger.warning("Welcome email delivery failed for %s", student_email)


async def _send_bulk_student_welcome_emails(
    created_students: List[Dict],
    school_name: Optional[str],
) -> None:
    for student in created_students:
        await _send_student_welcome_email(
            student_name=student["name"],
            student_email=student["email"],
            temp_password=student["temp_password"],
            school_name=school_name,
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
            cur.execute("""
                SELECT id, email, name, role, school_id, must_change_password, created_at 
                FROM admin_users WHERE email = %s
            """, (email,))
            admin = cur.fetchone()
            if not admin:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Check password
            cur.execute("SELECT password_hash FROM admin_users WHERE id = %s", (admin["id"],))
            pw_row = cur.fetchone()
            if not pw_row or not _verify(password, pw_row["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Check if school is suspended (for school admins)
            if admin.get("school_id"):
                cur.execute("SELECT is_active FROM schools WHERE id = %s", (admin["school_id"],))
                school_row = cur.fetchone()
                if school_row and not school_row["is_active"]:
                    raise HTTPException(status_code=403, detail="Your school has been suspended. Please contact support.")
            
            token = _make_admin_token(admin["id"], admin.get("school_id"))
            user = {
                "id": admin["id"],
                "email": admin["email"],
                "name": admin["name"],
                "role": _normalize_role(admin["role"]),
                "school_id": admin.get("school_id"),
                "must_change_password": admin.get("must_change_password", False),
                "created_at": str(admin["created_at"]) if admin["created_at"] else None,
            }
            
            # Include curriculum_imported for school admins
            if admin.get("school_id"):
                cur.execute("SELECT curriculum_imported FROM schools WHERE id = %s", (admin["school_id"],))
                school_row = cur.fetchone()
                user["curriculum_imported"] = bool(school_row and school_row["curriculum_imported"]) if school_row else False
            
            return {"token": token, "user": user}
        finally:
            conn.close()
    
    @staticmethod
    def get_me(admin_id: int) -> Dict:
        """Get admin profile."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, email, name, role, school_id, must_change_password, created_at 
                FROM admin_users WHERE id = %s
            """, (admin_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Admin not found")
            result = {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "role": _normalize_role(row["role"]),
                "school_id": row.get("school_id"),
                "must_change_password": row.get("must_change_password", False),
                "created_at": str(row["created_at"]) if row["created_at"] else None,
            }
            
            # Include curriculum_imported flag for school admins
            if row.get("school_id"):
                cur.execute("SELECT curriculum_imported FROM schools WHERE id = %s", (row["school_id"],))
                school_row = cur.fetchone()
                result["curriculum_imported"] = bool(school_row and school_row["curriculum_imported"]) if school_row else False
            
            return result
        finally:
            conn.close()

    @staticmethod
    def change_password(admin_id: int, new_password: str) -> Dict:
        """Change admin password (clears must_change_password flag)."""
        if len(new_password) < 8:
            raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
        
        conn = get_db()
        try:
            cur = conn.cursor()
            pw_hash = _hash(new_password)
            cur.execute("""
                UPDATE admin_users 
                SET password_hash = %s, must_change_password = FALSE 
                WHERE id = %s
                RETURNING id
            """, (pw_hash, admin_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Admin not found")
            conn.commit()
            return {"success": True, "message": "Password changed successfully"}
        finally:
            conn.close()

    @staticmethod
    def get_school_id(admin_id: int) -> int | None:
        """Get school_id for an admin (None for superadmin)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT school_id FROM admin_users WHERE id = %s", (admin_id,))
            row = cur.fetchone()
            return row["school_id"] if row else None
        finally:
            conn.close()
    
    # ── Boards ────────────────────────────────────────────────
    
    @staticmethod
    def _school_id_filter(school_id: int = None) -> tuple:
        """Return SQL filter and params for school_id scoping."""
        if school_id is None:
            return "school_id IS NULL", []
        return "school_id = %s", [school_id]
    
    @staticmethod
    def _make_scoped_id(base_id: str, school_id: int = None) -> str:
        """Create school-scoped ID for curriculum items."""
        base = base_id.lower().strip()
        if school_id is None:
            return base  # Global template keeps original ID
        return f"s{school_id}_{base}"  # School-specific gets prefixed
    
    @staticmethod
    def list_boards(school_id: int = None) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(f"SELECT * FROM boards WHERE {filter_sql} ORDER BY sort_order, name", params)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def upsert_board(board_id: str, name: str, sort_order: int, is_active: bool, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            scoped_id = AdminService._make_scoped_id(board_id, school_id)
            cur.execute(
                """INSERT INTO boards (id, name, sort_order, is_active, school_id)
                   VALUES (%s,%s,%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                   sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (scoped_id, name.strip(), sort_order, is_active, school_id)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()
    
    @staticmethod
    def delete_board(board_id: str, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            # Cascade: remove all curriculum rows that reference this board
            cur.execute(f"DELETE FROM curriculum WHERE board_id=%s AND {filter_sql}", [board_id] + params)
            cur.execute(f"DELETE FROM boards WHERE id=%s AND {filter_sql}", [board_id] + params)
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def import_boards(rows: List[Dict], school_id: int = None) -> Dict:
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
                scoped_id = AdminService._make_scoped_id(bid, school_id)
                cur.execute("SELECT id FROM boards WHERE id=%s", (scoped_id,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO boards (id, name, sort_order, is_active, school_id)
                       VALUES (%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (scoped_id, str(row.get("name", "")).strip(),
                     int(row.get("sort_order", 0)), bool(row.get("is_active", True)), school_id)
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
    def list_standards(school_id: int = None) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(f"SELECT * FROM standards WHERE {filter_sql} ORDER BY grade_num", params)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def upsert_standard(std_id: str, name: str, grade_num: int, sort_order: int, is_active: bool, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            scoped_id = AdminService._make_scoped_id(std_id, school_id)
            cur.execute(
                """INSERT INTO standards (id, name, grade_num, sort_order, is_active, school_id)
                   VALUES (%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, grade_num=EXCLUDED.grade_num,
                   sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (scoped_id, name.strip(), grade_num, sort_order, is_active, school_id)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()
    
    @staticmethod
    def delete_standard(std_id: str, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            # Cascade: remove all curriculum rows that reference this standard
            cur.execute(f"DELETE FROM curriculum WHERE standard_id=%s AND {filter_sql}", [std_id] + params)
            cur.execute(f"DELETE FROM standards WHERE id=%s AND {filter_sql}", [std_id] + params)
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()
    
    # ── Mediums ───────────────────────────────────────────────
    
    @staticmethod
    def list_mediums(school_id: int = None) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(f"SELECT * FROM mediums WHERE {filter_sql} ORDER BY sort_order, name", params)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def upsert_medium(med_id: str, name: str, sort_order: int, is_active: bool, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            scoped_id = AdminService._make_scoped_id(med_id, school_id)
            cur.execute(
                """INSERT INTO mediums (id, name, sort_order, is_active, school_id)
                   VALUES (%s,%s,%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                   sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (scoped_id, name.strip(), sort_order, is_active, school_id)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()
    
    @staticmethod
    def delete_medium(med_id: str, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            # Cascade: remove all curriculum rows that reference this medium
            cur.execute(f"DELETE FROM curriculum WHERE medium_id=%s AND {filter_sql}", [med_id] + params)
            cur.execute(f"DELETE FROM mediums WHERE id=%s AND {filter_sql}", [med_id] + params)
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def import_standards(rows: List[Dict], school_id: int = None) -> Dict:
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
                scoped_id = AdminService._make_scoped_id(sid, school_id)
                cur.execute("SELECT id FROM standards WHERE id=%s", (scoped_id,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO standards (id, name, grade_num, sort_order, is_active, school_id)
                       VALUES (%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, grade_num=EXCLUDED.grade_num,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (scoped_id, str(row.get("name", "")).strip(),
                     int(row.get("grade_num", 0)), int(row.get("sort_order", 0)),
                     bool(row.get("is_active", True)), school_id)
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
    def import_mediums(rows: List[Dict], school_id: int = None) -> Dict:
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
                scoped_id = AdminService._make_scoped_id(mid, school_id)
                cur.execute("SELECT id FROM mediums WHERE id=%s", (scoped_id,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO mediums (id, name, sort_order, is_active, school_id)
                       VALUES (%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (scoped_id, str(row.get("name", "")).strip(),
                     int(row.get("sort_order", 0)), bool(row.get("is_active", True)), school_id)
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
    def list_subjects(board_id: str = None, standard_id: str = None, stream_id: str = None, school_id: int = None,
                      page: int = 1, page_size: int = 50, search: str = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            # Base conditions
            conditions = [f"s.{filter_sql}"]
            if board_id:
                conditions.append("s.board_id = %s")
                params.append(board_id)
            if standard_id:
                conditions.append("s.standard_id = %s")
                params.append(standard_id)
            if stream_id:
                conditions.append("s.stream_id = %s")
                params.append(stream_id)
            if search:
                conditions.append("LOWER(s.name) LIKE %s")
                params.append(f"%{search.lower()}%")
            
            where_clause = " AND ".join(conditions)
            
            # Get total count
            cur.execute(f"""
                SELECT COUNT(*) AS cnt FROM subjects s WHERE {where_clause}
            """, params)
            total = cur.fetchone()["cnt"]
            
            # Get paginated data
            offset = (page - 1) * page_size
            query = f"""
                SELECT s.*, b.name as board_name, st.name as standard_name, str.name as stream_name
                FROM subjects s
                LEFT JOIN boards b ON s.board_id = b.id
                LEFT JOIN standards st ON s.standard_id = st.id
                LEFT JOIN streams str ON s.stream_id = str.id
                WHERE {where_clause}
                ORDER BY b.sort_order, st.sort_order, s.sort_order
                LIMIT %s OFFSET %s
            """
            cur.execute(query, params + [page_size, offset])
            items = [dict(row) for row in cur.fetchall()]
            return {"items": items, "total": total, "page": page, "page_size": page_size}
        finally:
            conn.close()

    @staticmethod
    def upsert_subject(subj_id: str, name: str, board_id: str, standard_id: str, stream_id: str = None, sort_order: int = 0, is_active: bool = True, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            scoped_id = AdminService._make_scoped_id(subj_id, school_id)
            scoped_board_id = AdminService._make_scoped_id(board_id, school_id) if board_id else board_id
            scoped_standard_id = AdminService._make_scoped_id(standard_id, school_id) if standard_id else standard_id
            cur.execute(
                """INSERT INTO subjects (id, name, board_id, standard_id, stream_id, sort_order, is_active, school_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (id) DO UPDATE SET
                   name=EXCLUDED.name, board_id=EXCLUDED.board_id, standard_id=EXCLUDED.standard_id,
                   stream_id=EXCLUDED.stream_id, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (scoped_id, name.strip(), scoped_board_id, scoped_standard_id, stream_id, sort_order, is_active, school_id)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def delete_subject(subj_id: str, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(f"DELETE FROM subjects WHERE id=%s AND {filter_sql}", [subj_id] + params)
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def import_subjects(rows: List[Dict], school_id: int = None) -> Dict:
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
                scoped_id = AdminService._make_scoped_id(sid, school_id)
                board_id = str(row.get("board_id", "")).strip()
                standard_id = str(row.get("standard_id", "")).strip()
                scoped_board_id = AdminService._make_scoped_id(board_id, school_id) if board_id else board_id
                scoped_standard_id = AdminService._make_scoped_id(standard_id, school_id) if standard_id else standard_id
                
                cur.execute("SELECT id FROM subjects WHERE id=%s", (scoped_id,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO subjects (id, name, board_id, standard_id, sort_order, is_active, school_id)
                       VALUES (%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, board_id=EXCLUDED.board_id,
                       standard_id=EXCLUDED.standard_id, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (scoped_id, str(row.get("name", "")).strip(),
                     scoped_board_id, scoped_standard_id,
                     int(row.get("sort_order", 0)),
                     bool(row.get("is_active", True)), school_id)
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
    def bulk_delete_subjects(ids: List[str], school_id: int = None) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM subjects WHERE id IN ({placeholders}) AND {filter_sql}", ids + params)
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted}
        finally:
            conn.close()

    # ── Curriculum (deprecated) ───────────────────────────────

    @staticmethod
    def list_curriculum(school_id: int = None) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(
                f"""SELECT c.id, c.board_id, c.standard_id, c.medium_id, c.subjects, c.is_active,
                          b.name AS board_name, s.name AS standard_name, m.name AS medium_name
                   FROM curriculum c
                   LEFT JOIN boards b ON c.board_id = b.id
                   LEFT JOIN standards s ON c.standard_id = s.id
                   LEFT JOIN mediums m ON c.medium_id = m.id
                   WHERE c.{filter_sql}
                   ORDER BY c.board_id, c.standard_id, c.medium_id""", params
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
    def create_curriculum(board_id: str, standard_id: str, medium_id: str, subjects: List[str], is_active: bool = True, school_id: int = None) -> Dict:
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            scoped_board_id = AdminService._make_scoped_id(board_id, school_id)
            scoped_standard_id = AdminService._make_scoped_id(standard_id, school_id)
            scoped_medium_id = AdminService._make_scoped_id(medium_id, school_id)
            cur.execute(
                """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects, is_active, school_id)
                   VALUES (%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (board_id, standard_id, medium_id)
                   DO UPDATE SET subjects=EXCLUDED.subjects, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (scoped_board_id, scoped_standard_id, scoped_medium_id, _json.dumps(subjects), is_active, school_id)
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
    def update_curriculum(row_id: int, subjects: List[str] = None, is_active: bool = None, school_id: int = None) -> Dict:
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            if subjects is not None and is_active is not None:
                cur.execute(
                    f"UPDATE curriculum SET subjects=%s, is_active=%s WHERE id=%s AND {filter_sql} RETURNING *",
                    [_json.dumps(subjects), is_active, row_id] + params
                )
            elif subjects is not None:
                cur.execute(
                    f"UPDATE curriculum SET subjects=%s WHERE id=%s AND {filter_sql} RETURNING *",
                    [_json.dumps(subjects), row_id] + params
                )
            elif is_active is not None:
                cur.execute(
                    f"UPDATE curriculum SET is_active=%s WHERE id=%s AND {filter_sql} RETURNING *",
                    [is_active, row_id] + params
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
    def delete_curriculum(row_id: int, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(f"DELETE FROM curriculum WHERE id=%s AND {filter_sql}", [row_id] + params)
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_standards(ids: List[str], school_id: int = None) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM curriculum WHERE standard_id IN ({placeholders}) AND {filter_sql}", ids + params)
            cur.execute(f"DELETE FROM standards WHERE id IN ({placeholders}) AND {filter_sql}", ids + params)
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_boards(ids: List[str], school_id: int = None) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM curriculum WHERE board_id IN ({placeholders}) AND {filter_sql}", ids + params)
            cur.execute(f"DELETE FROM boards WHERE id IN ({placeholders}) AND {filter_sql}", ids + params)
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_mediums(ids: List[str], school_id: int = None) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM curriculum WHERE medium_id IN ({placeholders}) AND {filter_sql}", ids + params)
            cur.execute(f"DELETE FROM mediums WHERE id IN ({placeholders}) AND {filter_sql}", ids + params)
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_curriculum(ids: List[int], school_id: int = None) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM curriculum WHERE id IN ({placeholders}) AND {filter_sql}", ids + params)
            conn.commit()
            return {"deleted": len(ids)}
        finally:
            conn.close()

    @staticmethod
    def import_curriculum(rows: List[Dict], school_id: int = None) -> Dict:
        import json as _json
        conn = get_db()
        created = 0
        errors = []
        try:
            cur = conn.cursor()
            for r in rows:
                try:
                    board_id = r["board_id"]
                    standard_id = r["standard_id"]
                    medium_id = r["medium_id"]
                    scoped_board_id = AdminService._make_scoped_id(board_id, school_id)
                    scoped_standard_id = AdminService._make_scoped_id(standard_id, school_id)
                    scoped_medium_id = AdminService._make_scoped_id(medium_id, school_id)
                    cur.execute(
                        """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects, is_active, school_id)
                           VALUES (%s,%s,%s,%s,TRUE,%s)
                           ON CONFLICT (board_id, standard_id, medium_id)
                           DO UPDATE SET subjects=EXCLUDED.subjects, is_active=TRUE""",
                        (scoped_board_id, scoped_standard_id, scoped_medium_id, _json.dumps(r.get("subjects", [])), school_id)
                    )
                    created += 1
                except Exception as e:
                    errors.append(str(e))
            conn.commit()
            return {"created": created, "errors": errors}
        finally:
            conn.close()

    @staticmethod
    def import_global_curriculum(school_id: int) -> Dict:
        """Import all global curriculum (school_id=NULL) to a specific school.
        
        Uses batch processing with commits every 500 records to handle large datasets.
        """
        from psycopg2.extras import execute_values
        
        conn = get_db()
        BATCH_SIZE = 500
        
        try:
            cur = conn.cursor()
            counts = {"boards": 0, "standards": 0, "mediums": 0, "subjects": 0, "curriculum": 0, "chapters": 0}
            
            # ─── 1. Copy boards (batch insert) ───
            cur.execute("SELECT id, name, sort_order, is_active FROM boards WHERE school_id IS NULL")
            rows = cur.fetchall()
            if rows:
                batch = []
                for row in rows:
                    new_id = f"s{school_id}_{row['id']}"
                    batch.append((new_id, row['name'], row['sort_order'], row['is_active'], school_id))
                execute_values(
                    cur,
                    """INSERT INTO boards (id, name, sort_order, is_active, school_id)
                       VALUES %s ON CONFLICT DO NOTHING""",
                    batch
                )
                counts["boards"] = len(batch)
                conn.commit()
            
            # ─── 2. Copy standards (batch insert) ───
            cur.execute("SELECT id, name, grade_num, sort_order, is_active FROM standards WHERE school_id IS NULL")
            rows = cur.fetchall()
            if rows:
                batch = []
                for row in rows:
                    new_id = f"s{school_id}_{row['id']}"
                    batch.append((new_id, row['name'], row['grade_num'], row['sort_order'], row['is_active'], school_id))
                execute_values(
                    cur,
                    """INSERT INTO standards (id, name, grade_num, sort_order, is_active, school_id)
                       VALUES %s ON CONFLICT DO NOTHING""",
                    batch
                )
                counts["standards"] = len(batch)
                conn.commit()
            
            # ─── 3. Copy mediums (batch insert) ───
            cur.execute("SELECT id, name, sort_order, is_active FROM mediums WHERE school_id IS NULL")
            rows = cur.fetchall()
            if rows:
                batch = []
                for row in rows:
                    new_id = f"s{school_id}_{row['id']}"
                    batch.append((new_id, row['name'], row['sort_order'], row['is_active'], school_id))
                execute_values(
                    cur,
                    """INSERT INTO mediums (id, name, sort_order, is_active, school_id)
                       VALUES %s ON CONFLICT DO NOTHING""",
                    batch
                )
                counts["mediums"] = len(batch)
                conn.commit()
            
            # ─── 4. Copy subjects (batch insert) ───
            # Note: stream_id is NOT prefixed because streams table is global
            cur.execute("SELECT id, name, board_id, standard_id, stream_id, sort_order, is_active FROM subjects WHERE school_id IS NULL")
            rows = cur.fetchall()
            if rows:
                batch = []
                for row in rows:
                    new_id = f"s{school_id}_{row['id']}"
                    new_board_id = f"s{school_id}_{row['board_id']}"
                    new_standard_id = f"s{school_id}_{row['standard_id']}"
                    stream_id = row.get('stream_id')  # stays as-is (global)
                    batch.append((new_id, row['name'], new_board_id, new_standard_id, stream_id, row['sort_order'], row['is_active'], school_id))
                execute_values(
                    cur,
                    """INSERT INTO subjects (id, name, board_id, standard_id, stream_id, sort_order, is_active, school_id)
                       VALUES %s ON CONFLICT DO NOTHING""",
                    batch
                )
                counts["subjects"] = len(batch)
                conn.commit()
            
            # ─── 5. Copy curriculum (batch insert) ───
            cur.execute("SELECT board_id, standard_id, medium_id, subjects, is_active FROM curriculum WHERE school_id IS NULL")
            rows = cur.fetchall()
            if rows:
                batch = []
                for row in rows:
                    new_board_id = f"s{school_id}_{row['board_id']}"
                    new_standard_id = f"s{school_id}_{row['standard_id']}"
                    new_medium_id = f"s{school_id}_{row['medium_id']}"
                    batch.append((new_board_id, new_standard_id, new_medium_id, row['subjects'], row['is_active'], school_id))
                execute_values(
                    cur,
                    """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects, is_active, school_id)
                       VALUES %s ON CONFLICT DO NOTHING""",
                    batch
                )
                counts["curriculum"] = len(batch)
                conn.commit()
            
            # ─── 6. Copy chapters (batch insert with chunking for large data) ───
            cur.execute("""SELECT board_id, standard_id, subject_id, chapter_number, chapter_name, 
                                  chapter_name_local, description, topics, is_active 
                           FROM chapters WHERE school_id IS NULL""")
            rows = cur.fetchall()
            if rows:
                total_chapters = 0
                batch = []
                for row in rows:
                    new_board_id = f"s{school_id}_{row['board_id']}"
                    new_standard_id = f"s{school_id}_{row['standard_id']}"
                    new_subject_id = f"s{school_id}_{row['subject_id']}"
                    batch.append((
                        new_board_id, new_standard_id, new_subject_id, 
                        row['chapter_number'], row['chapter_name'],
                        row.get('chapter_name_local', ''), row.get('description', ''), 
                        row.get('topics', '[]'), row['is_active'], school_id
                    ))
                    
                    # Commit in batches of BATCH_SIZE
                    if len(batch) >= BATCH_SIZE:
                        execute_values(
                            cur,
                            """INSERT INTO chapters (board_id, standard_id, subject_id, chapter_number, chapter_name, 
                                                     chapter_name_local, description, topics, is_active, school_id)
                               VALUES %s ON CONFLICT DO NOTHING""",
                            batch
                        )
                        total_chapters += len(batch)
                        batch = []
                        conn.commit()
                
                # Insert remaining rows
                if batch:
                    execute_values(
                        cur,
                        """INSERT INTO chapters (board_id, standard_id, subject_id, chapter_number, chapter_name, 
                                                 chapter_name_local, description, topics, is_active, school_id)
                           VALUES %s ON CONFLICT DO NOTHING""",
                        batch
                    )
                    total_chapters += len(batch)
                    conn.commit()
                
                counts["chapters"] = total_chapters
            
            # ─── 7. Mark school as curriculum imported ───
            cur.execute("UPDATE schools SET curriculum_imported = TRUE WHERE id = %s", (school_id,))
            conn.commit()
            
            return {"success": True, "imported": counts}
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    # ── Chapters ──────────────────────────────────────────────

    @staticmethod
    def list_chapters_admin(
        board_id: str = None,
        standard_id: str = None,
        subject_id: str = None,
        is_active: bool = None,
        school_id: int = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict:
        """List chapters with school_id filtering for admin. Returns paginated results."""
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            # Base WHERE clause
            where_clause = f"c.{filter_sql}"
            
            if board_id:
                where_clause += " AND c.board_id = %s"
                params.append(board_id)
            if standard_id:
                where_clause += " AND c.standard_id = %s"
                params.append(standard_id)
            if subject_id:
                where_clause += " AND c.subject_id = %s"
                params.append(subject_id)
            if is_active is not None:
                where_clause += " AND c.is_active = %s"
                params.append(is_active)
            
            # Get total count first (fast query without joins)
            count_query = f"SELECT COUNT(*) AS cnt FROM chapters c WHERE {where_clause}"
            cur.execute(count_query, params)
            total = cur.fetchone()["cnt"]
            
            # Get paginated data with joins
            offset = (page - 1) * page_size
            query = f"""
                SELECT c.id, c.board_id, c.standard_id, c.subject_id, c.chapter_number, c.chapter_name,
                       c.chapter_name_local, c.description, c.topics, c.content_status, c.is_active, c.created_at,
                       b.name as board_name, st.name as standard_name, s.name as subject_name
                FROM chapters c
                LEFT JOIN boards b ON c.board_id = b.id
                LEFT JOIN standards st ON c.standard_id = st.id
                LEFT JOIN subjects s ON c.subject_id = s.id
                WHERE {where_clause}
                ORDER BY c.chapter_number ASC
                LIMIT %s OFFSET %s
            """
            params.extend([page_size, offset])
            cur.execute(query, params)
            
            result = []
            for row in cur.fetchall():
                chapter = dict(row)
                if chapter.get("topics"):
                    try:
                        if isinstance(chapter["topics"], str):
                            chapter["topics"] = _json.loads(chapter["topics"])
                    except Exception:
                        chapter["topics"] = []
                else:
                    chapter["topics"] = []
                result.append(chapter)
            
            return {"items": result, "total": total, "page": page, "page_size": page_size}
        finally:
            conn.close()

    @staticmethod
    def get_chapter_admin(chapter_id: int, school_id: int = None) -> Dict:
        """Get a single chapter with school_id verification."""
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            cur.execute(
                f"""SELECT c.id, c.board_id, c.standard_id, c.subject_id, c.chapter_number, c.chapter_name,
                          c.chapter_name_local, c.description, c.topics, c.content_status, c.is_active, c.created_at,
                          b.name as board_name, st.name as standard_name, s.name as subject_name
                   FROM chapters c
                   LEFT JOIN boards b ON c.board_id = b.id
                   LEFT JOIN standards st ON c.standard_id = st.id
                   LEFT JOIN subjects s ON c.subject_id = s.id
                   WHERE c.id = %s AND c.{filter_sql}""",
                [chapter_id] + params
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Chapter not found")
            
            chapter = dict(row)
            if chapter.get("topics"):
                try:
                    if isinstance(chapter["topics"], str):
                        chapter["topics"] = _json.loads(chapter["topics"])
                except Exception:
                    chapter["topics"] = []
            else:
                chapter["topics"] = []
            return chapter
        finally:
            conn.close()

    @staticmethod
    def create_chapter_admin(
        board_id: str, standard_id: str, subject_id: str, chapter_number: int,
        chapter_name: str, chapter_name_local: str = "", description: str = "",
        topics: List = None, content_status: str = "draft", is_active: bool = True, school_id: int = None
    ) -> Dict:
        """Create a chapter with school_id."""
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            # Check duplicate
            cur.execute(
                f"""SELECT id FROM chapters
                   WHERE board_id = %s AND standard_id = %s AND subject_id = %s 
                   AND chapter_number = %s AND {filter_sql}""",
                [board_id, standard_id, subject_id, chapter_number] + params
            )
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Chapter already exists")
            
            topics_json = _json.dumps(topics or [])
            cur.execute(
                """INSERT INTO chapters (board_id, standard_id, subject_id, chapter_number, chapter_name,
                                         chapter_name_local, description, topics, content_status, is_active, school_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   RETURNING id, created_at""",
                (board_id, standard_id, subject_id, chapter_number, chapter_name,
                 chapter_name_local, description, topics_json, content_status, is_active, school_id)
            )
            row = cur.fetchone()
            conn.commit()
            
            return {
                "id": row["id"],
                "board_id": board_id,
                "standard_id": standard_id,
                "subject_id": subject_id,
                "chapter_number": chapter_number,
                "chapter_name": chapter_name,
                "chapter_name_local": chapter_name_local,
                "description": description,
                "topics": topics or [],
                "content_status": content_status,
                "is_active": is_active,
                "created_at": str(row["created_at"]),
            }
        finally:
            conn.close()

    @staticmethod
    def update_chapter_admin(
        chapter_id: int, chapter_name: str = None, chapter_name_local: str = None,
        description: str = None, topics: List = None, content_status: str = None, 
        is_active: bool = None, school_id: int = None
    ) -> Dict:
        """Update a chapter with school_id verification."""
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            # Verify chapter belongs to school
            cur.execute(f"SELECT id FROM chapters WHERE id = %s AND {filter_sql}", [chapter_id] + params)
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Chapter not found")
            
            updates = []
            update_params = []
            if chapter_name is not None:
                updates.append("chapter_name = %s")
                update_params.append(chapter_name)
            if chapter_name_local is not None:
                updates.append("chapter_name_local = %s")
                update_params.append(chapter_name_local)
            if description is not None:
                updates.append("description = %s")
                update_params.append(description)
            if topics is not None:
                updates.append("topics = %s")
                update_params.append(_json.dumps(topics))
            if content_status is not None:
                updates.append("content_status = %s")
                update_params.append(content_status)
            if is_active is not None:
                updates.append("is_active = %s")
                update_params.append(is_active)
            
            if not updates:
                return AdminService.get_chapter_admin(chapter_id, school_id)
            
            update_params.append(chapter_id)
            cur.execute(f"UPDATE chapters SET {', '.join(updates)} WHERE id = %s", update_params)
            conn.commit()
            
            return AdminService.get_chapter_admin(chapter_id, school_id)
        finally:
            conn.close()

    @staticmethod
    def delete_chapter_admin(chapter_id: int, school_id: int = None) -> Dict:
        """Delete a chapter with school_id verification."""
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(f"DELETE FROM chapters WHERE id = %s AND {filter_sql}", [chapter_id] + params)
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted > 0}
        finally:
            conn.close()

    @staticmethod
    def bulk_create_chapters_admin(chapters: List[Dict], school_id: int = None) -> Dict:
        """Bulk create chapters with school_id."""
        import json as _json
        conn = get_db()
        created = 0
        try:
            cur = conn.cursor()
            for ch in chapters:
                try:
                    topics_json = _json.dumps(ch.get("topics", []))
                    cur.execute(
                        """INSERT INTO chapters (board_id, standard_id, subject_id, chapter_number, chapter_name,
                                                 chapter_name_local, description, topics, is_active, school_id)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                           ON CONFLICT (board_id, standard_id, subject_id, chapter_number) DO NOTHING""",
                        (ch["board_id"], ch["standard_id"], ch["subject_id"], ch["chapter_number"],
                         ch["chapter_name"], ch.get("chapter_name_local", ""), ch.get("description", ""),
                         topics_json, ch.get("is_active", True), school_id)
                    )
                    if cur.rowcount > 0:
                        created += 1
                except Exception:
                    pass  # Skip duplicates
            conn.commit()
            return {"created": created}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_chapters_admin(ids: List[int], school_id: int = None) -> Dict:
        """Bulk delete chapters with school_id filtering."""
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM chapters WHERE id IN ({placeholders}) AND {filter_sql}", ids + params)
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted}
        finally:
            conn.close()

    # ── Users ─────────────────────────────────────────────────

    @staticmethod
    def list_users(search: str = "", plan: str = "", drishti_only: bool = False, school_id: int = None,
                   page: int = 1, page_size: int = 50) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Use standard school_id filtering: superadmin sees only school_id IS NULL,
            # school admin sees only their school's students
            filter_sql, params = AdminService._school_id_filter(school_id)
            conditions = [filter_sql]
            
            if search:
                conditions.append("(LOWER(name) LIKE %s OR LOWER(email) LIKE %s OR LOWER(COALESCE(school, '')) LIKE %s)")
                like = f"%{search.lower()}%"
                params.extend([like, like, like])
            if plan:
                conditions.append("plan = %s")
                params.append(plan)
            if drishti_only:
                conditions.append("is_drishti = TRUE")
            where = "WHERE " + " AND ".join(conditions)
            
            # Get total count
            cur.execute(f"SELECT COUNT(*) AS cnt FROM users {where}", params)
            total = cur.fetchone()["cnt"]
            
            # Get paginated data
            offset = (page - 1) * page_size
            cur.execute(
                f"""SELECT id, name, email, standard, board, stream, language, plan,
                           plan_expires_at, xp, streak, is_drishti, is_suspended, school,
                           ai_provider, ai_model, ai_admin_override, school_id,
                           last_active, created_at
                    FROM users {where}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s""",
                params + [page_size, offset]
            )
            items = [dict(r) for r in cur.fetchall()]
            return {"items": items, "total": total, "page": page, "page_size": page_size}
        finally:
            conn.close()

    @staticmethod
    def _verify_user_school(cur, user_id: str, school_id: int) -> bool:
        """Verify a user belongs to a school. Returns True if OK, raises 403 if not."""
        if school_id is None:
            return True  # Superadmin can access all
        cur.execute("SELECT school_id FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        if row["school_id"] != school_id:
            raise HTTPException(status_code=403, detail="Cannot modify users from other schools")
        return True

    @staticmethod
    def update_user_plan(user_id: str, plan: str, plan_expires_at: str = None, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            AdminService._verify_user_school(cur, user_id, school_id)
            cur.execute(
                "UPDATE users SET plan=%s, plan_expires_at=%s WHERE id=%s",
                (plan, plan_expires_at or "", user_id)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def toggle_drishti(user_id: str, is_drishti: bool, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            AdminService._verify_user_school(cur, user_id, school_id)
            cur.execute("UPDATE users SET is_drishti=%s WHERE id=%s", (is_drishti, user_id))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def update_user_ai_config(user_id: str, provider: str, model: str, override: bool, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            AdminService._verify_user_school(cur, user_id, school_id)
            cur.execute(
                "UPDATE users SET ai_provider=%s, ai_model=%s, ai_admin_override=%s WHERE id=%s",
                (provider, model, override, user_id)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def create_drishti_student(name: str, email: str, password: str, standard: str, board: str, language: str, school_id: int = None) -> Dict:
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
                """INSERT INTO users (id, name, email, password_hash, standard, board, language, is_drishti, plan, school_id)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,TRUE,'free',%s)""",
                (user_id, name.strip(), email, pw_hash, standard, board, language, school_id)
            )
            conn.commit()
            return {"id": user_id, "name": name, "email": email}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_users(ids: List[str], school_id: int = None) -> Dict:
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            placeholders = ",".join(["%s"] * len(ids))
            
            # School admin can only delete their school's users
            if school_id is not None:
                cur.execute(
                    f"DELETE FROM users WHERE id IN ({placeholders}) AND school_id = %s",
                    [*ids, school_id]
                )
            else:
                cur.execute(f"DELETE FROM users WHERE id IN ({placeholders})", ids)
            
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted}
        finally:
            conn.close()

    @staticmethod
    def create_student(name: str, email: str, password: str, standard: str, board: str, stream: str, language: str, plan: str = "free", school_id: int = None, send_welcome_email: bool = False) -> Dict:
        """Create a student. School admins automatically assign their school_id.
        
        If password is empty and send_welcome_email=True, generates a temp password and sends email.
        Stream is required for Class 11-12 (Science, Commerce, Arts).
        """
        import uuid
        import bcrypt as _bcrypt
        import secrets
        from app.modules.schools.service import SCHOOL_TO_USER_PLAN
        conn = get_db()
        try:
            cur = conn.cursor()
            email = email.strip().lower()
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Email already registered")
            
            # School students inherit the school's plan
            school_name = None
            if school_id:
                cur.execute("SELECT name, plan, student_limit FROM schools WHERE id = %s", (school_id,))
                school_row = cur.fetchone()
                if school_row:
                    school_name = school_row["name"]
                    plan = SCHOOL_TO_USER_PLAN.get(school_row["plan"], "basic")
                    # Enforce student limit
                    cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE school_id = %s", (school_id,))
                    current_count = cur.fetchone()["cnt"]
                    if current_count >= school_row["student_limit"]:
                        raise HTTPException(status_code=400, detail=f"Student limit reached ({school_row['student_limit']}). Upgrade your school plan to add more students.")
            
            # Generate temp password if not provided or if sending welcome email
            must_change = False
            temp_password = ""
            actual_password = password
            if not password or send_welcome_email:
                # Generate 8-char alphanumeric temp password
                temp_password = secrets.token_urlsafe(6)[:8]
                actual_password = temp_password
                must_change = True
            
            pw_hash = _bcrypt.hashpw(actual_password.encode(), _bcrypt.gensalt()).decode()
            user_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO users (id, name, email, password_hash, standard, board, stream, language, plan, school_id, must_change_password, temp_password)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (user_id, name.strip(), email, pw_hash, standard, board, stream or '', language, plan, school_id, must_change, temp_password)
            )
            conn.commit()
            
            result = {
                "id": user_id, 
                "name": name, 
                "email": email, 
                "standard": standard, 
                "board": board,
                "stream": stream or '',
                "language": language, 
                "plan": plan, 
                "school_id": school_id,
                "must_change_password": must_change,
            }
            if temp_password:
                result["temp_password"] = temp_password

            # Queue email in background so student creation remains fast.
            if send_welcome_email and temp_password:
                _run_async_in_background(
                    _send_student_welcome_email(
                        student_name=name.strip(),
                        student_email=email,
                        temp_password=temp_password,
                        school_name=school_name,
                    ),
                    task_name="student-welcome-email",
                )
                result["email_status"] = "queued"
            elif send_welcome_email:
                result["email_status"] = "skipped"

            return result
        finally:
            conn.close()

    @staticmethod
    def bulk_import_students(students: list, school_id: int = None, send_email: bool = True) -> Dict:
        """Bulk import students with auto-generated temp passwords."""
        import uuid
        import bcrypt as _bcrypt
        import secrets
        from app.modules.schools.service import SCHOOL_TO_USER_PLAN
        
        results = {
            "success": 0,
            "failed": 0,
            "errors": [],
            "created_students": []
        }
        
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Get school name and inherited plan
            school_name = None
            inherited_plan = None
            student_limit = None
            if school_id:
                cur.execute("SELECT name, plan, student_limit FROM schools WHERE id = %s", (school_id,))
                row = cur.fetchone()
                if row:
                    school_name = row["name"]
                    inherited_plan = SCHOOL_TO_USER_PLAN.get(row["plan"], "basic")
                    student_limit = row["student_limit"]
            
            # Enforce student limit for school bulk imports
            if school_id and student_limit is not None:
                cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE school_id = %s", (school_id,))
                current_count = cur.fetchone()["cnt"]
                if current_count + len(students) > student_limit:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Would exceed student limit ({student_limit}). Current: {current_count}, Importing: {len(students)}. Upgrade your school plan."
                    )
            
            for idx, student_data in enumerate(students):
                try:
                    email = student_data.get("email", "").strip().lower()
                    name = student_data.get("name", "").strip()
                    
                    if not email or not name:
                        results["errors"].append({
                            "row": idx + 1,
                            "email": email,
                            "error": "Name and email are required"
                        })
                        results["failed"] += 1
                        continue
                    
                    # Check if email exists
                    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
                    if cur.fetchone():
                        results["errors"].append({
                            "row": idx + 1,
                            "email": email,
                            "error": "Email already registered"
                        })
                        results["failed"] += 1
                        continue
                    
                    # Generate temp password
                    temp_password = secrets.token_urlsafe(6)[:8]
                    pw_hash = _bcrypt.hashpw(temp_password.encode(), _bcrypt.gensalt()).decode()
                    user_id = str(uuid.uuid4())
                    
                    cur.execute(
                        """INSERT INTO users (id, name, email, password_hash, standard, board, stream, language, plan, school_id, must_change_password, temp_password)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE,%s)""",
                        (
                            user_id,
                            name,
                            email,
                            pw_hash,
                            student_data.get("standard", "Class 10"),
                            student_data.get("board", "CBSE"),
                            student_data.get("stream", ""),
                            student_data.get("language", "English"),
                            inherited_plan or student_data.get("plan", "free"),
                            school_id,
                            temp_password
                        )
                    )
                    
                    results["success"] += 1
                    results["created_students"].append({
                        "id": user_id,
                        "name": name,
                        "email": email,
                        "temp_password": temp_password,
                        "standard": student_data.get("standard", "Class 10"),
                        "board": student_data.get("board", "CBSE"),
                        "stream": student_data.get("stream", ""),
                    })
                    
                except Exception as e:
                    results["errors"].append({
                        "row": idx + 1,
                        "email": student_data.get("email", ""),
                        "error": str(e)
                    })
                    results["failed"] += 1
            
            conn.commit()
            
            if send_email and results["created_students"]:
                _run_async_in_background(
                    _send_bulk_student_welcome_emails(results["created_students"], school_name),
                    task_name="bulk-student-welcome-emails",
                )
                results["email_status"] = "queued"
                results["emails_queued"] = len(results["created_students"])
            elif send_email:
                results["email_status"] = "skipped"
                results["emails_queued"] = 0
            
            return results
        finally:
            conn.close()

    @staticmethod
    def get_student_temp_password(user_id: str, school_id: int = None) -> Dict:
        """Return a student's temporary password for admin fallback workflows."""
        conn = get_db()
        try:
            cur = conn.cursor()
            AdminService._verify_user_school(cur, user_id, school_id)
            cur.execute(
                """
                SELECT id, name, email, temp_password, must_change_password
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Student not found")

            temp_password = (row.get("temp_password") or "").strip()
            if not temp_password:
                raise HTTPException(status_code=404, detail="No temporary password available for this student")

            return {
                "id": row["id"],
                "name": row["name"],
                "email": row["email"],
                "temp_password": temp_password,
                "must_change_password": bool(row.get("must_change_password")),
            }
        finally:
            conn.close()

    @staticmethod
    def update_student(user_id: str, name: str = None, email: str = None, standard: str = None, 
                       board: str = None, stream: str = None, language: str = None, 
                       plan: str = None, plan_expires_at: str = None, 
                       is_drishti: bool = None, is_suspended: bool = None, school_id: int = None) -> Dict:
        """Update student details."""
        conn = get_db()
        try:
            cur = conn.cursor()
            AdminService._verify_user_school(cur, user_id, school_id)
            
            updates = []
            params = []
            if name is not None:
                updates.append("name = %s")
                params.append(name)
            if email is not None:
                # Check email uniqueness
                cur.execute("SELECT id FROM users WHERE email = %s AND id != %s", (email.lower(), user_id))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="Email already in use")
                updates.append("email = %s")
                params.append(email.lower())
            if standard is not None:
                updates.append("standard = %s")
                params.append(standard)
            if board is not None:
                updates.append("board = %s")
                params.append(board)
            if stream is not None:
                updates.append("stream = %s")
                params.append(stream)
            if language is not None:
                updates.append("language = %s")
                params.append(language)
            if plan is not None:
                updates.append("plan = %s")
                params.append(plan)
            if plan_expires_at is not None:
                updates.append("plan_expires_at = %s")
                params.append(plan_expires_at)
            if is_drishti is not None:
                updates.append("is_drishti = %s")
                params.append(is_drishti)
            if is_suspended is not None:
                updates.append("is_suspended = %s")
                params.append(is_suspended)
            
            if not updates:
                return {"ok": True}
            
            params.append(user_id)
            cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", params)
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    # ── API / Model Dashboard ──────────────────────────────────

    @staticmethod
    def get_api_dashboard(from_date: str = None, to_date: str = None, school_id: int = None) -> Dict:
        """Return live provider pool status, plan routing, and usage estimates for a date range."""
        from services.ai_service import _KEY_POOLS, _PLAN_ROUTING
        conn = get_db()
        try:
            cur = conn.cursor()
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            start_date = from_date if from_date else today
            end_date = to_date if to_date else today

            # Build school filter
            school_filter = ""
            school_params = []
            if school_id is not None:
                school_filter = "AND u.school_id = %s"
                school_params = [school_id]

            # Calls + tokens grouped by user plan for date range
            cur.execute(
                f"""SELECT u.plan,
                          COALESCE(SUM(a.call_count), 0)                        AS calls,
                          COALESCE(SUM(a.prompt_tokens + a.completion_tokens), 0) AS tokens
                   FROM ai_usage a
                   JOIN users u ON u.id = a.user_id
                   WHERE a.date >= %s AND a.date <= %s {school_filter}
                   GROUP BY u.plan""",
                [start_date, end_date] + school_params,
            )
            plan_usage: dict = {r["plan"]: {"calls": int(r["calls"]), "tokens": int(r["tokens"])}
                                for r in cur.fetchall()}

            # Total users per plan (filtered by school if applicable)
            if school_id is not None:
                cur.execute("SELECT plan, COUNT(*) AS cnt FROM users WHERE school_id = %s GROUP BY plan", (school_id,))
            else:
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
    def get_usage_summary(days: int = 7, school_id: int = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Build school filter for queries that join with users
            school_filter = ""
            school_params = []
            if school_id is not None:
                school_filter = "AND u.school_id = %s"
                school_params = [school_id]
            
            # All-time totals with separate prompt/completion tokens (filtered by school)
            if school_id is not None:
                cur.execute("""
                    SELECT 
                        COALESCE(SUM(a.call_count), 0) AS total_calls,
                        COALESCE(SUM(a.prompt_tokens), 0) AS total_prompt_tokens,
                        COALESCE(SUM(a.completion_tokens), 0) AS total_completion_tokens
                    FROM ai_usage a
                    JOIN users u ON u.id = a.user_id
                    WHERE u.school_id = %s
                """, (school_id,))
            else:
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
            if school_id is not None:
                cur.execute(
                    """SELECT a.date, 
                              SUM(a.call_count) AS calls, 
                              SUM(a.prompt_tokens) AS prompt_tokens,
                              SUM(a.completion_tokens) AS completion_tokens
                       FROM ai_usage a
                       JOIN users u ON u.id = a.user_id
                       WHERE a.date::date >= CURRENT_DATE - (%s || ' days')::interval
                       AND u.school_id = %s
                       GROUP BY a.date""",
                    (days, school_id)
                )
            else:
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
            if school_id is not None:
                cur.execute("""
                    SELECT us.plan, 
                           COUNT(DISTINCT u.user_id) AS users,
                           SUM(u.call_count) AS calls
                    FROM ai_usage u
                    LEFT JOIN users us ON us.id = u.user_id
                    WHERE u.date::date >= CURRENT_DATE - (%s || ' days')::interval
                    AND us.school_id = %s
                    GROUP BY us.plan
                """, (days, school_id))
            else:
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
    def get_quota_overview(school_id: int = None) -> Dict:
        """Return day/month usage, pending quota, and overall provider key capacity."""
        from services.ai_service import _KEY_POOLS, _PLAN_ROUTING
        from app.modules.ai.service import PLANS_QUOTA

        now = datetime.now(timezone.utc)
        today = now.strftime("%Y-%m-%d")
        month_start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_start = month_start_dt.strftime("%Y-%m-%d")

        if now.month == 12:
            next_month = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            next_month = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        days_in_month = (next_month - month_start_dt).days

        conn = get_db()
        try:
            cur = conn.cursor()

            school_filter = ""
            school_params: list = []
            if school_id is not None:
                school_filter = "AND u.school_id = %s"
                school_params = [school_id]

            # Total users in scope
            if school_id is not None:
                cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE school_id = %s", (school_id,))
            else:
                cur.execute("SELECT COUNT(*) AS cnt FROM users")
            total_users = int(cur.fetchone()["cnt"])

            # Today usage
            cur.execute(
                f"""SELECT COALESCE(SUM(a.call_count), 0) AS calls,
                           COALESCE(SUM(a.prompt_tokens + a.completion_tokens), 0) AS tokens,
                           COUNT(DISTINCT a.user_id) AS active_users
                    FROM ai_usage a
                    JOIN users u ON u.id = a.user_id
                    WHERE a.date = %s {school_filter}""",
                [today] + school_params,
            )
            today_row = cur.fetchone()
            today_calls = int(today_row["calls"])
            today_tokens = int(today_row["tokens"])
            today_active_users = int(today_row["active_users"])

            # Month-to-date usage
            cur.execute(
                f"""SELECT COALESCE(SUM(a.call_count), 0) AS calls,
                           COALESCE(SUM(a.prompt_tokens + a.completion_tokens), 0) AS tokens,
                           COUNT(DISTINCT a.user_id) AS active_users
                    FROM ai_usage a
                    JOIN users u ON u.id = a.user_id
                    WHERE a.date >= %s AND a.date <= %s {school_filter}""",
                [month_start, today] + school_params,
            )
            month_row = cur.fetchone()
            month_calls = int(month_row["calls"])
            month_tokens = int(month_row["tokens"])
            month_active_users = int(month_row["active_users"])

            # Users by plan in scope
            if school_id is not None:
                cur.execute("SELECT plan, COUNT(*) AS cnt FROM users WHERE school_id = %s GROUP BY plan", (school_id,))
            else:
                cur.execute("SELECT plan, COUNT(*) AS cnt FROM users GROUP BY plan")
            user_counts_by_plan = {r["plan"]: int(r["cnt"]) for r in cur.fetchall()}

            # Plan usage today and month (for provider estimates)
            cur.execute(
                f"""SELECT u.plan,
                           COALESCE(SUM(a.call_count), 0) AS calls,
                           COALESCE(SUM(a.prompt_tokens + a.completion_tokens), 0) AS tokens
                    FROM ai_usage a
                    JOIN users u ON u.id = a.user_id
                    WHERE a.date = %s {school_filter}
                    GROUP BY u.plan""",
                [today] + school_params,
            )
            plan_usage_today = {
                r["plan"]: {"calls": int(r["calls"]), "tokens": int(r["tokens"])}
                for r in cur.fetchall()
            }

            cur.execute(
                f"""SELECT u.plan,
                           COALESCE(SUM(a.call_count), 0) AS calls,
                           COALESCE(SUM(a.prompt_tokens + a.completion_tokens), 0) AS tokens
                    FROM ai_usage a
                    JOIN users u ON u.id = a.user_id
                    WHERE a.date >= %s AND a.date <= %s {school_filter}
                    GROUP BY u.plan""",
                [month_start, today] + school_params,
            )
            plan_usage_month = {
                r["plan"]: {"calls": int(r["calls"]), "tokens": int(r["tokens"])}
                for r in cur.fetchall()
            }

            # User quota capacity (plan daily limits) and pending
            daily_user_quota_total = 0
            for plan, count in user_counts_by_plan.items():
                limit = int(PLANS_QUOTA.get(plan, PLANS_QUOTA.get("free", 10)))
                daily_user_quota_total += count * limit

            daily_user_quota_remaining = max(daily_user_quota_total - today_calls, 0)
            month_user_quota_total = daily_user_quota_total * days_in_month
            month_user_quota_remaining = max(month_user_quota_total - month_calls, 0)

            # Provider capacity estimates from key pools
            FREE_LIMITS = {
                "groq": 1000,
                "gemini": 1500,
                "anthropic": 0,
                "openai": 0,
                "nvidia": 40,
            }
            GROQ_MODEL_LIMITS = {
                "llama-3.1-8b-instant": 14400,
                "llama-3.3-70b-versatile": 1000,
                "llama-3.3-70b-specdec": 1000,
                "llama-3.1-70b-versatile": 1000,
                "openai/gpt-oss-20b": 1000,
                "openai/gpt-oss-120b": 1000,
            }

            provider_calls_today: dict = {}
            provider_calls_month: dict = {}
            provider_tokens_today: dict = {}
            provider_tokens_month: dict = {}

            for plan, usage in plan_usage_today.items():
                routing = _PLAN_ROUTING.get(plan, {})
                prov = routing.get("provider", "groq")
                provider_calls_today[prov] = provider_calls_today.get(prov, 0) + usage["calls"]
                provider_tokens_today[prov] = provider_tokens_today.get(prov, 0) + usage["tokens"]

            for plan, usage in plan_usage_month.items():
                routing = _PLAN_ROUTING.get(plan, {})
                prov = routing.get("provider", "groq")
                provider_calls_month[prov] = provider_calls_month.get(prov, 0) + usage["calls"]
                provider_tokens_month[prov] = provider_tokens_month.get(prov, 0) + usage["tokens"]

            providers = []
            total_keys = 0
            total_daily_key_capacity = 0
            known_provider_calls_today = 0
            known_provider_calls_month = 0

            for prov in ["groq", "gemini", "anthropic", "openai", "nvidia"]:
                keys_count = len(_KEY_POOLS.get(prov, []))
                total_keys += keys_count

                per_key_limit = FREE_LIMITS[prov]
                if prov == "groq":
                    active_groq_model = next(
                        (r.get("model") for r in _PLAN_ROUTING.values() if r.get("provider") == "groq"),
                        "llama-3.3-70b-versatile",
                    )
                    per_key_limit = GROQ_MODEL_LIMITS.get(active_groq_model, FREE_LIMITS["groq"])

                daily_capacity = per_key_limit * keys_count if per_key_limit > 0 else 0
                calls_today_provider = int(provider_calls_today.get(prov, 0))
                calls_month_provider = int(provider_calls_month.get(prov, 0))

                daily_remaining = max(daily_capacity - calls_today_provider, 0) if daily_capacity > 0 else None
                month_capacity = daily_capacity * days_in_month if daily_capacity > 0 else 0
                month_remaining = max(month_capacity - calls_month_provider, 0) if month_capacity > 0 else None

                if daily_capacity > 0:
                    total_daily_key_capacity += daily_capacity
                    known_provider_calls_today += calls_today_provider
                    known_provider_calls_month += calls_month_provider

                providers.append({
                    "provider": prov,
                    "keys": keys_count,
                    "per_key_daily_limit": per_key_limit,
                    "daily_capacity": daily_capacity,
                    "daily_calls_used": calls_today_provider,
                    "daily_calls_remaining": daily_remaining,
                    "month_capacity": month_capacity,
                    "month_calls_used": calls_month_provider,
                    "month_calls_remaining": month_remaining,
                    "tokens_today": int(provider_tokens_today.get(prov, 0)),
                    "tokens_month": int(provider_tokens_month.get(prov, 0)),
                })

            total_daily_key_remaining = max(total_daily_key_capacity - known_provider_calls_today, 0)
            total_month_key_capacity = total_daily_key_capacity * days_in_month
            total_month_key_remaining = max(total_month_key_capacity - known_provider_calls_month, 0)

            return {
                "scope": "school" if school_id is not None else "global",
                "today": {
                    "date": today,
                    "active_users": today_active_users,
                    "calls_used": today_calls,
                    "tokens_used": today_tokens,
                },
                "month": {
                    "month_start": month_start,
                    "month_end": today,
                    "days_in_month": days_in_month,
                    "active_users": month_active_users,
                    "calls_used": month_calls,
                    "tokens_used": month_tokens,
                },
                "users": {
                    "total_users": total_users,
                    "by_plan": user_counts_by_plan,
                },
                "user_quota": {
                    "daily_total": daily_user_quota_total,
                    "daily_remaining": daily_user_quota_remaining,
                    "month_total": month_user_quota_total,
                    "month_remaining": month_user_quota_remaining,
                },
                "keys_quota": {
                    "total_keys": total_keys,
                    "daily_total_capacity": total_daily_key_capacity,
                    "daily_remaining": total_daily_key_remaining,
                    "month_total_capacity": total_month_key_capacity,
                    "month_remaining": total_month_key_remaining,
                    "providers": providers,
                },
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
    def get_usage_by_users(days: int = 7, school_id: int = None) -> List[Dict]:
        """Get aggregated AI usage per user for the past N days."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Build school filter
            school_filter = ""
            school_params = []
            if school_id is not None:
                school_filter = "AND us.school_id = %s"
                school_params = [school_id]
            
            cur.execute(
                f"""SELECT u.user_id, 
                          us.name, 
                          us.email, 
                          us.plan,
                          SUM(u.call_count) AS calls,
                          SUM(u.prompt_tokens) AS prompt_tokens,
                          SUM(u.completion_tokens) AS completion_tokens
                   FROM ai_usage u
                   LEFT JOIN users us ON us.id = u.user_id
                   WHERE u.date::date >= CURRENT_DATE - (%s || ' days')::interval
                   {school_filter}
                   GROUP BY u.user_id, us.name, us.email, us.plan
                   ORDER BY SUM(u.call_count) DESC 
                   LIMIT 100""",
                [days] + school_params
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
            # Import canonical defaults from ai_service to stay in sync
            from services.ai_service import _DEFAULT_PLAN_ROUTING
            default_routing = _DEFAULT_PLAN_ROUTING
            for plan, val in default_routing.items():
                if plan not in routing:
                    routing[plan] = val
            # Key status and slots
            providers = ["gemini", "groq", "anthropic", "openai", "nvidia"]
            key_status = {}
            key_slots = {}
            def mask_key(k: str) -> str:
                """Decrypt if needed, then return masked hint for UI display."""
                if not k or len(k) < 8:
                    return "••••••••"
                from services.ai_service import _decrypt_key
                plain = _decrypt_key(k)
                if not plain or len(plain) < 8:
                    return "••••••••"
                return plain[:4] + "••••" + plain[-4:]

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
        from services.ai_service import save_plan_routing
        save_plan_routing(plan, provider, model)
        return {"ok": True}

    @staticmethod
    def save_ai_key(provider: str, key: str, slot: int = 1) -> Dict:
        from services.ai_service import save_api_key
        save_api_key(provider, key, slot)
        return {"ok": True}

    @staticmethod
    def remove_ai_key(provider: str, slot: int) -> Dict:
        from services.ai_service import remove_api_key_slot
        remove_api_key_slot(provider, slot)
        return {"ok": True}

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
            "groq":      ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"],
            "gemini":    ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"],
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
    def list_squads(page: int = 1, page_size: int = 50, search: str = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Build WHERE clause
            conditions = []
            params = []
            if search:
                conditions.append("(LOWER(s.name) LIKE %s OR LOWER(s.focus_subject) LIKE %s)")
                like = f"%{search.lower()}%"
                params.extend([like, like])
            where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            
            # Get total count
            cur.execute(f"SELECT COUNT(*) AS cnt FROM squads s {where_clause}", params)
            total = cur.fetchone()["cnt"]
            
            # Get paginated data with aggregates
            offset = (page - 1) * page_size
            cur.execute(f"""
                SELECT s.id, s.name, s.focus_subject, s.standard, s.medium, s.is_active, s.created_at,
                       COUNT(DISTINCT sm.user_id) AS member_count,
                       COUNT(DISTINCT msg.id) AS message_count,
                       COUNT(DISTINCT d.id) AS doubt_count
                FROM squads s
                LEFT JOIN squad_members sm ON sm.squad_id = s.id
                LEFT JOIN squad_messages msg ON msg.squad_id = s.id
                LEFT JOIN squad_doubts d ON d.squad_id = s.id
                {where_clause}
                GROUP BY s.id
                ORDER BY s.created_at DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            items = [dict(r) for r in cur.fetchall()]
            return {"items": items, "total": total, "page": page, "page_size": page_size}
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
    def get_analytics_overview(school_id: int = None) -> Dict:
        """Get high-level platform analytics. Scoped to school if school_id provided."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Build school filter
            school_filter = ""
            school_params = []
            if school_id is not None:
                school_filter = "WHERE school_id = %s"
                school_params = [school_id]
            
            # Total users
            cur.execute(f"SELECT COUNT(*) AS total FROM users {school_filter}", school_params)
            total_users = cur.fetchone()["total"]
            
            # Active today (handle empty last_active)
            where = f"WHERE last_active != '' AND last_active::date = CURRENT_DATE"
            if school_id is not None:
                where += " AND school_id = %s"
            cur.execute(f"SELECT COUNT(*) AS total FROM users {where}", school_params)
            active_today = cur.fetchone()["total"]
            
            # Active this week
            where = f"WHERE last_active != '' AND last_active::date > CURRENT_DATE - INTERVAL '7 days'"
            if school_id is not None:
                where += " AND school_id = %s"
            cur.execute(f"SELECT COUNT(*) AS total FROM users {where}", school_params)
            active_7d = cur.fetchone()["total"]
            
            # Active this month
            where = f"WHERE last_active != '' AND last_active::date > CURRENT_DATE - INTERVAL '30 days'"
            if school_id is not None:
                where += " AND school_id = %s"
            cur.execute(f"SELECT COUNT(*) AS total FROM users {where}", school_params)
            active_30d = cur.fetchone()["total"]
            
            # Signups today (handle empty created_at)
            where = f"WHERE created_at != '' AND created_at::date = CURRENT_DATE"
            if school_id is not None:
                where += " AND school_id = %s"
            cur.execute(f"SELECT COUNT(*) AS total FROM users {where}", school_params)
            signups_today = cur.fetchone()["total"]
            
            # Signups this week
            where = f"WHERE created_at != '' AND created_at::date > CURRENT_DATE - INTERVAL '7 days'"
            if school_id is not None:
                where += " AND school_id = %s"
            cur.execute(f"SELECT COUNT(*) AS total FROM users {where}", school_params)
            signups_7d = cur.fetchone()["total"]
            
            # Total AI calls today (join with users for school filtering)
            if school_id is not None:
                cur.execute("""
                    SELECT COALESCE(SUM(a.call_count), 0) AS total 
                    FROM ai_usage a JOIN users u ON a.user_id = u.id
                    WHERE a.date = CURRENT_DATE::text AND u.school_id = %s
                """, [school_id])
            else:
                cur.execute("SELECT COALESCE(SUM(call_count), 0) AS total FROM ai_usage WHERE date = CURRENT_DATE::text")
            ai_calls_today = cur.fetchone()["total"]
            
            # Total AI calls this week
            if school_id is not None:
                cur.execute("""
                    SELECT COALESCE(SUM(a.call_count), 0) AS total 
                    FROM ai_usage a JOIN users u ON a.user_id = u.id
                    WHERE a.date != '' AND a.date::date > CURRENT_DATE - INTERVAL '7 days' AND u.school_id = %s
                """, [school_id])
            else:
                cur.execute("""
                    SELECT COALESCE(SUM(call_count), 0) AS total FROM ai_usage 
                    WHERE date != '' AND date::date > CURRENT_DATE - INTERVAL '7 days'
                """)
            ai_calls_7d = cur.fetchone()["total"]
            
            # Paid subscriptions
            where = "WHERE plan != 'free' AND (plan_expires_at = '' OR plan_expires_at > CURRENT_DATE::text)"
            if school_id is not None:
                where += " AND school_id = %s"
            cur.execute(f"SELECT COUNT(*) AS total FROM users {where}", school_params)
            paid_subs = cur.fetchone()["total"]
            
            # Users by plan
            cur.execute(f"SELECT plan, COUNT(*) AS count FROM users {school_filter} GROUP BY plan", school_params)
            by_plan = {r["plan"]: r["count"] for r in cur.fetchall()}
            
            # Average streak
            cur.execute(f"SELECT COALESCE(AVG(streak), 0) AS avg FROM users {school_filter}", school_params)
            avg_streak = round(cur.fetchone()["avg"], 1)
            
            # Total XP
            cur.execute(f"SELECT COALESCE(SUM(xp), 0) AS total FROM users {school_filter}", school_params)
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
    def get_analytics_students(school_id: int = None) -> Dict:
        """Get detailed student analytics. Scoped to school if school_id provided."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Build school filter
            school_filter = ""
            school_params = []
            if school_id is not None:
                school_filter = "WHERE school_id = %s"
                school_params = [school_id]
            
            # By board
            cur.execute(f"SELECT board, COUNT(*) AS count FROM users {school_filter} GROUP BY board ORDER BY count DESC", school_params)
            by_board = {r["board"]: r["count"] for r in cur.fetchall()}
            
            # By standard
            cur.execute(f"SELECT standard, COUNT(*) AS count FROM users {school_filter} GROUP BY standard ORDER BY count DESC", school_params)
            by_standard = {r["standard"]: r["count"] for r in cur.fetchall()}
            
            # By language/medium
            cur.execute(f"SELECT language, COUNT(*) AS count FROM users {school_filter} GROUP BY language ORDER BY count DESC", school_params)
            by_language = {r["language"]: r["count"] for r in cur.fetchall()}
            
            # By school (top 20) - only for superadmin
            if school_id is None:
                cur.execute("""
                    SELECT school, COUNT(*) AS count 
                    FROM users 
                    WHERE school != '' AND school IS NOT NULL
                    GROUP BY school 
                    ORDER BY count DESC 
                    LIMIT 20
                """)
                by_school = [{"school": r["school"], "count": r["count"]} for r in cur.fetchall()]
            else:
                by_school = []
            
            # Drishti students
            if school_id is not None:
                cur.execute("SELECT COUNT(*) AS total FROM users WHERE is_drishti = TRUE AND school_id = %s", [school_id])
            else:
                cur.execute("SELECT COUNT(*) AS total FROM users WHERE is_drishti = TRUE")
            drishti_count = cur.fetchone()["total"]
            
            # Top 10 by XP
            if school_id is not None:
                cur.execute("""
                    SELECT id, name, xp, streak, plan, standard, board
                    FROM users WHERE school_id = %s
                    ORDER BY xp DESC LIMIT 10
                """, [school_id])
            else:
                cur.execute("""
                    SELECT id, name, xp, streak, plan, standard, board
                    FROM users
                    ORDER BY xp DESC
                    LIMIT 10
                """)
            top_by_xp = [dict(r) for r in cur.fetchall()]
            
            # Top 10 by streak
            if school_id is not None:
                cur.execute("""
                    SELECT id, name, xp, streak, plan, standard, board
                    FROM users WHERE school_id = %s
                    ORDER BY streak DESC LIMIT 10
                """, [school_id])
            else:
                cur.execute("""
                    SELECT id, name, xp, streak, plan, standard, board
                    FROM users
                    ORDER BY streak DESC
                    LIMIT 10
                """)
            top_by_streak = [dict(r) for r in cur.fetchall()]
            
            # Growth chart (last 30 days)
            where = "WHERE created_at != '' AND created_at::date > CURRENT_DATE - INTERVAL '30 days'"
            if school_id is not None:
                where += " AND school_id = %s"
            cur.execute(f"""
                SELECT created_at::date AS date, COUNT(*) AS count
                FROM users {where}
                GROUP BY created_at::date
                ORDER BY date
            """, school_params)
            growth_chart = [{"date": str(r["date"]), "count": r["count"]} for r in cur.fetchall()]
            
            # Activity chart (last 30 days)
            where = "WHERE last_active != '' AND last_active::date > CURRENT_DATE - INTERVAL '30 days'"
            if school_id is not None:
                where += " AND school_id = %s"
            cur.execute(f"""
                SELECT last_active::date AS date, COUNT(*) AS count
                FROM users {where}
                GROUP BY last_active::date
                ORDER BY date
            """, school_params)
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

    # ── School Teachers (B2B) ─────────────────────────────────

    @staticmethod
    def list_school_teachers(school_id: int = None, page: int = 1, page_size: int = 50, search: str = None) -> Dict:
        """List teachers for a school with pagination."""
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            # Add search condition
            conditions = [filter_sql]
            if search:
                conditions.append("(LOWER(name) LIKE %s OR LOWER(email) LIKE %s)")
                like = f"%{search.lower()}%"
                params.extend([like, like])
            where_clause = " AND ".join(conditions)
            
            # Get total count
            cur.execute(f"SELECT COUNT(*) AS cnt FROM school_teachers WHERE {where_clause}", params)
            total = cur.fetchone()["cnt"]
            
            # Get paginated data
            offset = (page - 1) * page_size
            cur.execute(f"""
                SELECT * FROM school_teachers 
                WHERE {where_clause} 
                ORDER BY name
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            items = [dict(r) for r in cur.fetchall()]
            return {"items": items, "total": total, "page": page, "page_size": page_size}
        finally:
            conn.close()

    @staticmethod
    def create_school_teacher(name: str, email: str, phone: str, subjects: List[str], 
                               standards: List[str], notes: str, school_id: int) -> Dict:
        """Create a teacher for a school."""
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO school_teachers (school_id, name, email, phone, subjects, standards, notes)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   RETURNING *""",
                (school_id, name.strip(), email.strip().lower(), phone.strip(),
                 _json.dumps(subjects), _json.dumps(standards), notes.strip())
            )
            row = cur.fetchone()
            conn.commit()
            result = dict(row)
            result["subjects"] = _json.loads(result["subjects"]) if isinstance(result["subjects"], str) else result["subjects"]
            result["standards"] = _json.loads(result["standards"]) if isinstance(result["standards"], str) else result["standards"]
            return result
        finally:
            conn.close()

    @staticmethod
    def update_school_teacher(teacher_id: int, name: str = None, email: str = None, phone: str = None,
                               subjects: List[str] = None, standards: List[str] = None, 
                               notes: str = None, is_active: bool = None, school_id: int = None) -> Dict:
        """Update a school teacher."""
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            # Verify teacher belongs to school
            cur.execute(f"SELECT id FROM school_teachers WHERE id = %s AND {filter_sql}", [teacher_id] + params)
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Teacher not found")
            
            updates = []
            update_params = []
            if name is not None:
                updates.append("name = %s")
                update_params.append(name.strip())
            if email is not None:
                updates.append("email = %s")
                update_params.append(email.strip().lower())
            if phone is not None:
                updates.append("phone = %s")
                update_params.append(phone.strip())
            if subjects is not None:
                updates.append("subjects = %s")
                update_params.append(_json.dumps(subjects))
            if standards is not None:
                updates.append("standards = %s")
                update_params.append(_json.dumps(standards))
            if notes is not None:
                updates.append("notes = %s")
                update_params.append(notes.strip())
            if is_active is not None:
                updates.append("is_active = %s")
                update_params.append(is_active)
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            
            update_params.append(teacher_id)
            cur.execute(f"UPDATE school_teachers SET {', '.join(updates)} WHERE id = %s RETURNING *", update_params)
            row = cur.fetchone()
            conn.commit()
            result = dict(row)
            result["subjects"] = _json.loads(result["subjects"]) if isinstance(result["subjects"], str) else result["subjects"]
            result["standards"] = _json.loads(result["standards"]) if isinstance(result["standards"], str) else result["standards"]
            return result
        finally:
            conn.close()

    @staticmethod
    def delete_school_teacher(teacher_id: int, school_id: int = None) -> Dict:
        """Delete a school teacher."""
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(f"DELETE FROM school_teachers WHERE id = %s AND {filter_sql}", [teacher_id] + params)
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted > 0}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_school_teachers(ids: List[int], school_id: int = None) -> Dict:
        """Bulk delete school teachers."""
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM school_teachers WHERE id IN ({placeholders}) AND {filter_sql}", ids + params)
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted}
        finally:
            conn.close()

    # ── Questions (B2B) ───────────────────────────────────────

    @staticmethod
    def list_questions(chapter_id: int = None, type: str = None, difficulty: str = None, 
                       search: str = None, limit: int = 100, offset: int = 0, school_id: int = None) -> Dict:
        """List questions with filters."""
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            conditions = [filter_sql]
            if chapter_id:
                conditions.append("chapter_id = %s")
                params.append(chapter_id)
            if type:
                conditions.append("type = %s")
                params.append(type)
            if difficulty:
                conditions.append("difficulty = %s")
                params.append(difficulty)
            if search:
                conditions.append("(LOWER(question) LIKE %s OR LOWER(tags::text) LIKE %s)")
                like = f"%{search.lower()}%"
                params.extend([like, like])
            
            where = " AND ".join(conditions)
            
            # Get total
            cur.execute(f"SELECT COUNT(*) AS total FROM questions WHERE {where}", params)
            total = cur.fetchone()["total"]
            
            # Get items
            cur.execute(
                f"""SELECT q.*, c.chapter_name 
                    FROM questions q
                    LEFT JOIN chapters c ON q.chapter_id = c.id
                    WHERE q.{where}
                    ORDER BY q.created_at DESC
                    LIMIT %s OFFSET %s""",
                params + [limit, offset]
            )
            
            items = []
            for row in cur.fetchall():
                item = dict(row)
                if isinstance(item.get("options"), str):
                    item["options"] = _json.loads(item["options"])
                if isinstance(item.get("tags"), str):
                    item["tags"] = _json.loads(item["tags"])
                items.append(item)
            
            return {"items": items, "total": total}
        finally:
            conn.close()

    @staticmethod
    def get_question(question_id: int, school_id: int = None) -> Dict:
        """Get a single question."""
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(
                f"""SELECT q.*, c.chapter_name 
                    FROM questions q
                    LEFT JOIN chapters c ON q.chapter_id = c.id
                    WHERE q.id = %s AND q.{filter_sql}""",
                [question_id] + params
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Question not found")
            item = dict(row)
            if isinstance(item.get("options"), str):
                item["options"] = _json.loads(item["options"])
            if isinstance(item.get("tags"), str):
                item["tags"] = _json.loads(item["tags"])
            return item
        finally:
            conn.close()

    @staticmethod
    def create_question(chapter_id: int, type: str, difficulty: str, question: str, 
                        options: List[str], correct_answer: str, explanation: str,
                        tags: List[str], created_by: str, school_id: int = None) -> Dict:
        """Create a question."""
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO questions (school_id, chapter_id, type, difficulty, question, 
                                          options, correct_answer, explanation, tags, created_by)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   RETURNING *""",
                (school_id, chapter_id, type, difficulty, question.strip(),
                 _json.dumps(options), correct_answer, explanation.strip(),
                 _json.dumps(tags), created_by)
            )
            row = cur.fetchone()
            conn.commit()
            item = dict(row)
            item["options"] = _json.loads(item["options"]) if isinstance(item["options"], str) else item["options"]
            item["tags"] = _json.loads(item["tags"]) if isinstance(item["tags"], str) else item["tags"]
            return item
        finally:
            conn.close()

    @staticmethod
    def update_question(question_id: int, type: str = None, difficulty: str = None, question: str = None,
                        options: List[str] = None, correct_answer: str = None, explanation: str = None,
                        tags: List[str] = None, is_active: bool = None, school_id: int = None) -> Dict:
        """Update a question."""
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            # Verify question belongs to school
            cur.execute(f"SELECT id FROM questions WHERE id = %s AND {filter_sql}", [question_id] + params)
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Question not found")
            
            updates = []
            update_params = []
            if type is not None:
                updates.append("type = %s")
                update_params.append(type)
            if difficulty is not None:
                updates.append("difficulty = %s")
                update_params.append(difficulty)
            if question is not None:
                updates.append("question = %s")
                update_params.append(question.strip())
            if options is not None:
                updates.append("options = %s")
                update_params.append(_json.dumps(options))
            if correct_answer is not None:
                updates.append("correct_answer = %s")
                update_params.append(correct_answer)
            if explanation is not None:
                updates.append("explanation = %s")
                update_params.append(explanation.strip())
            if tags is not None:
                updates.append("tags = %s")
                update_params.append(_json.dumps(tags))
            if is_active is not None:
                updates.append("is_active = %s")
                update_params.append(is_active)
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            
            if not updates:
                return AdminService.get_question(question_id, school_id)
            
            update_params.append(question_id)
            cur.execute(f"UPDATE questions SET {', '.join(updates)} WHERE id = %s RETURNING *", update_params)
            row = cur.fetchone()
            conn.commit()
            item = dict(row)
            item["options"] = _json.loads(item["options"]) if isinstance(item["options"], str) else item["options"]
            item["tags"] = _json.loads(item["tags"]) if isinstance(item["tags"], str) else item["tags"]
            return item
        finally:
            conn.close()

    @staticmethod
    def delete_question(question_id: int, school_id: int = None) -> Dict:
        """Delete a question."""
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(f"DELETE FROM questions WHERE id = %s AND {filter_sql}", [question_id] + params)
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted > 0}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_questions(ids: List[int], school_id: int = None) -> Dict:
        """Bulk delete questions."""
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM questions WHERE id IN ({placeholders}) AND {filter_sql}", ids + params)
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted}
        finally:
            conn.close()

    # ── Media (B2B) ───────────────────────────────────────────

    @staticmethod
    def list_media(type: str = None, chapter_id: int = None, subject_id: str = None,
                   search: str = None, limit: int = 100, offset: int = 0, school_id: int = None) -> Dict:
        """List media files with filters."""
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            conditions = [filter_sql]
            if type:
                conditions.append("type = %s")
                params.append(type)
            if chapter_id:
                conditions.append("chapter_id = %s")
                params.append(chapter_id)
            if subject_id:
                conditions.append("subject_id = %s")
                params.append(subject_id)
            if search:
                conditions.append("LOWER(name) LIKE %s")
                params.append(f"%{search.lower()}%")
            
            where = " AND ".join(conditions)
            
            # Get total
            cur.execute(f"SELECT COUNT(*) AS total FROM media_files WHERE {where}", params)
            total = cur.fetchone()["total"]
            
            # Get items
            cur.execute(
                f"""SELECT * FROM media_files
                    WHERE {where}
                    ORDER BY uploaded_at DESC
                    LIMIT %s OFFSET %s""",
                params + [limit, offset]
            )
            
            items = [dict(row) for row in cur.fetchall()]
            return {"items": items, "total": total}
        finally:
            conn.close()

    @staticmethod
    def get_media(media_id: int, school_id: int = None) -> Dict:
        """Get a single media file."""
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(f"SELECT * FROM media_files WHERE id = %s AND {filter_sql}", [media_id] + params)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Media not found")
            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def create_media(name: str, type: str, url: str, thumbnail_url: str, size_bytes: int,
                     duration_sec: int, dimensions: str, subject_id: str, chapter_id: int,
                     created_by: str, school_id: int = None) -> Dict:
        """Create a media file entry."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO media_files (school_id, name, type, url, thumbnail_url, size_bytes,
                                            duration_sec, dimensions, subject_id, chapter_id, created_by)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   RETURNING *""",
                (school_id, name.strip(), type, url, thumbnail_url, size_bytes,
                 duration_sec, dimensions, subject_id, chapter_id, created_by)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def update_media(media_id: int, name: str = None, subject_id: str = None, chapter_id: int = None,
                     is_active: bool = None, school_id: int = None) -> Dict:
        """Update a media file."""
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            
            # Verify media belongs to school
            cur.execute(f"SELECT id FROM media_files WHERE id = %s AND {filter_sql}", [media_id] + params)
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Media not found")
            
            updates = []
            update_params = []
            if name is not None:
                updates.append("name = %s")
                update_params.append(name.strip())
            if subject_id is not None:
                updates.append("subject_id = %s")
                update_params.append(subject_id)
            if chapter_id is not None:
                updates.append("chapter_id = %s")
                update_params.append(chapter_id)
            if is_active is not None:
                updates.append("is_active = %s")
                update_params.append(is_active)
            
            if not updates:
                return AdminService.get_media(media_id, school_id)
            
            update_params.append(media_id)
            cur.execute(f"UPDATE media_files SET {', '.join(updates)} WHERE id = %s RETURNING *", update_params)
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def delete_media(media_id: int, school_id: int = None) -> Dict:
        """Delete a media file."""
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            cur.execute(f"DELETE FROM media_files WHERE id = %s AND {filter_sql}", [media_id] + params)
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted > 0}
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_media(ids: List[int], school_id: int = None) -> Dict:
        """Bulk delete media files."""
        if not ids:
            return {"deleted": 0}
        conn = get_db()
        try:
            cur = conn.cursor()
            filter_sql, params = AdminService._school_id_filter(school_id)
            placeholders = ",".join(["%s"] * len(ids))
            cur.execute(f"DELETE FROM media_files WHERE id IN ({placeholders}) AND {filter_sql}", ids + params)
            deleted = cur.rowcount
            conn.commit()
            return {"deleted": deleted}
        finally:
            conn.close()

    # ── AI Prompts ─────────────────────────────────────────────────────────

    @staticmethod
    def list_prompts(category: str = None, search: str = None, include_inactive: bool = False) -> List[Dict]:
        """List all AI prompts with optional filters."""
        conn = get_db()
        try:
            cur = conn.cursor()
            sql = "SELECT * FROM ai_prompts WHERE 1=1"
            params = []
            
            if not include_inactive:
                sql += " AND is_active = TRUE"
            
            if category:
                sql += " AND category = %s"
                params.append(category)
            
            if search:
                sql += " AND (name ILIKE %s OR key ILIKE %s OR description ILIKE %s)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
            
            sql += " ORDER BY category, name"
            cur.execute(sql, params)
            rows = cur.fetchall()
            
            prompts = []
            for row in rows:
                prompt = dict(row)
                # Parse variables JSON
                try:
                    prompt["variables"] = json.loads(prompt.get("variables", "[]"))
                except:
                    prompt["variables"] = []
                # Convert timestamps to strings
                if prompt.get("created_at"):
                    prompt["created_at"] = str(prompt["created_at"])
                if prompt.get("updated_at"):
                    prompt["updated_at"] = str(prompt["updated_at"])
                prompts.append(prompt)
            
            return prompts
        finally:
            conn.close()

    @staticmethod
    def get_prompt(prompt_id: int) -> Dict:
        """Get a single AI prompt by ID."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM ai_prompts WHERE id = %s", (prompt_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Prompt not found")
            
            prompt = dict(row)
            try:
                prompt["variables"] = json.loads(prompt.get("variables", "[]"))
            except:
                prompt["variables"] = []
            if prompt.get("created_at"):
                prompt["created_at"] = str(prompt["created_at"])
            if prompt.get("updated_at"):
                prompt["updated_at"] = str(prompt["updated_at"])
            return prompt
        finally:
            conn.close()

    @staticmethod
    def get_prompt_by_key(key: str) -> Optional[Dict]:
        """Get a single AI prompt by key (for AI system use)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM ai_prompts WHERE key = %s AND is_active = TRUE", (key,))
            row = cur.fetchone()
            if not row:
                return None
            
            prompt = dict(row)
            try:
                prompt["variables"] = json.loads(prompt.get("variables", "[]"))
            except:
                prompt["variables"] = []
            return prompt
        finally:
            conn.close()

    @staticmethod
    def create_prompt(key: str, name: str, description: str, category: str, template: str,
                      variables: List[str], model: str, max_tokens: int, temperature: float,
                      is_active: bool, admin_id: int) -> Dict:
        """Create a new AI prompt."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Check for duplicate key
            cur.execute("SELECT id FROM ai_prompts WHERE key = %s", (key,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail=f"Prompt with key '{key}' already exists")
            
            # Get admin email for updated_by
            cur.execute("SELECT email FROM admin_users WHERE id = %s", (admin_id,))
            admin_row = cur.fetchone()
            updated_by = admin_row["email"] if admin_row else str(admin_id)
            
            variables_json = json.dumps(variables or [])
            
            cur.execute("""
                INSERT INTO ai_prompts (key, name, description, category, template, variables,
                                        model, max_tokens, temperature, is_active, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (key.strip(), name.strip(), description.strip(), category, template,
                  variables_json, model, max_tokens, temperature, is_active, updated_by))
            
            row = cur.fetchone()
            conn.commit()
            
            prompt = dict(row)
            try:
                prompt["variables"] = json.loads(prompt.get("variables", "[]"))
            except:
                prompt["variables"] = []
            if prompt.get("created_at"):
                prompt["created_at"] = str(prompt["created_at"])
            if prompt.get("updated_at"):
                prompt["updated_at"] = str(prompt["updated_at"])
            return prompt
        finally:
            conn.close()

    @staticmethod
    def update_prompt(prompt_id: int, name: str = None, description: str = None, category: str = None,
                      template: str = None, variables: List[str] = None, model: str = None,
                      max_tokens: int = None, temperature: float = None, is_active: bool = None,
                      admin_id: int = None) -> Dict:
        """Update an AI prompt."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Verify prompt exists
            cur.execute("SELECT id, version FROM ai_prompts WHERE id = %s", (prompt_id,))
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Prompt not found")
            
            # Get admin email for updated_by
            updated_by = None
            if admin_id:
                cur.execute("SELECT email FROM admin_users WHERE id = %s", (admin_id,))
                admin_row = cur.fetchone()
                updated_by = admin_row["email"] if admin_row else str(admin_id)
            
            updates = ["updated_at = CURRENT_TIMESTAMP", "version = version + 1"]
            params = []
            
            if name is not None:
                updates.append("name = %s")
                params.append(name.strip())
            if description is not None:
                updates.append("description = %s")
                params.append(description.strip())
            if category is not None:
                updates.append("category = %s")
                params.append(category)
            if template is not None:
                updates.append("template = %s")
                params.append(template)
            if variables is not None:
                updates.append("variables = %s")
                params.append(json.dumps(variables))
            if model is not None:
                updates.append("model = %s")
                params.append(model)
            if max_tokens is not None:
                updates.append("max_tokens = %s")
                params.append(max_tokens)
            if temperature is not None:
                updates.append("temperature = %s")
                params.append(temperature)
            if is_active is not None:
                updates.append("is_active = %s")
                params.append(is_active)
            if updated_by:
                updates.append("updated_by = %s")
                params.append(updated_by)
            
            params.append(prompt_id)
            cur.execute(f"UPDATE ai_prompts SET {', '.join(updates)} WHERE id = %s RETURNING *", params)
            row = cur.fetchone()
            conn.commit()
            
            prompt = dict(row)
            try:
                prompt["variables"] = json.loads(prompt.get("variables", "[]"))
            except:
                prompt["variables"] = []
            if prompt.get("created_at"):
                prompt["created_at"] = str(prompt["created_at"])
            if prompt.get("updated_at"):
                prompt["updated_at"] = str(prompt["updated_at"])
            return prompt
        finally:
            conn.close()

    @staticmethod
    def delete_prompt(prompt_id: int) -> Dict:
        """Delete an AI prompt (soft delete by setting is_active=False)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE ai_prompts SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = %s", (prompt_id,))
            affected = cur.rowcount
            conn.commit()
            return {"deleted": affected > 0}
        finally:
            conn.close()

    @staticmethod
    def hard_delete_prompt(prompt_id: int) -> Dict:
        """Permanently delete an AI prompt."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM ai_prompts WHERE id = %s", (prompt_id,))
            affected = cur.rowcount
            conn.commit()
            return {"deleted": affected > 0}
        finally:
            conn.close()

    @staticmethod
    def seed_prompts_from_hardcoded(overwrite: bool = False, admin_id: int = None) -> Dict:
        """Seed prompts from hardcoded MODE_INSTRUCTIONS, TEACHER_PERSONAS, LANG_RULES, HOME_PROMPTS, INLINE_TEMPLATES, SERVICE_PROMPTS in prompts.py."""
        # Import here to avoid circular imports
        from app.modules.ai.prompts import MODE_INSTRUCTIONS, VALID_MODES, TEACHER_PERSONAS, LANG_RULES, HOME_PROMPTS, INLINE_TEMPLATES, SERVICE_PROMPTS
        import json as json_lib
        
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Get admin email
            updated_by = "system"
            if admin_id:
                cur.execute("SELECT email FROM admin_users WHERE id = %s", (admin_id,))
                admin_row = cur.fetchone()
                updated_by = admin_row["email"] if admin_row else "system"
            
            # Category mapping based on mode key prefix
            def get_category(key: str) -> str:
                if key.startswith("quiz_"):
                    return "quiz"
                elif key.startswith("examiner_") or key.startswith("essay_"):
                    return "grading"
                elif key.startswith("samjhao") or key.startswith("study_coach") or key.startswith("chapter_tutor") or key.startswith("notebook_"):
                    return "tutor"
                elif key.startswith("podcast_"):
                    return "summary"
                elif key.startswith("mental_"):
                    return "chat"
                elif key.startswith("persona_"):
                    return "persona"
                elif key.startswith("lang_rule_"):
                    return "language"
                elif key.startswith("home_"):
                    return "home"
                elif key.startswith("template_"):
                    return "template"
                elif key.startswith("service_"):
                    return "service"
                else:
                    return "system"
            
            # Name formatting
            def format_name(key: str) -> str:
                return key.replace("_", " ").title()
            
            def seed_prompt(key: str, template: str, category: str = None) -> str:
                """Seed single prompt, returns: 'inserted', 'updated', or 'skipped'"""
                if not template:
                    return "skipped"
                    
                cat = category or get_category(key)
                name = format_name(key)
                
                cur.execute("SELECT id FROM ai_prompts WHERE key = %s", (key,))
                existing = cur.fetchone()
                
                if existing:
                    if overwrite:
                        cur.execute("""
                            UPDATE ai_prompts SET template = %s, category = %s, name = %s,
                                   version = version + 1, updated_at = CURRENT_TIMESTAMP, updated_by = %s
                            WHERE key = %s
                        """, (template, cat, name, updated_by, key))
                        return "updated"
                    else:
                        return "skipped"
                else:
                    cur.execute("""
                        INSERT INTO ai_prompts (key, name, description, category, template, variables,
                                               model, max_tokens, temperature, is_active, updated_by)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (key, name, f"Prompt for {key}", cat, template,
                          "[]", "gpt-4o-mini", 1024, 0.7, True, updated_by))
                    return "inserted"
            
            inserted = 0
            updated = 0
            skipped = 0
            
            # 1. Seed MODE_INSTRUCTIONS
            for key in VALID_MODES:
                template = MODE_INSTRUCTIONS.get(key)
                result = seed_prompt(key, template)
                if result == "inserted": inserted += 1
                elif result == "updated": updated += 1
                else: skipped += 1
            
            # 2. Seed TEACHER_PERSONAS (store as JSON)
            for lang, persona in TEACHER_PERSONAS.items():
                key = f"persona_{lang}"
                template = json_lib.dumps(persona)  # {"name": "...", "desc": "..."}
                result = seed_prompt(key, template, "persona")
                if result == "inserted": inserted += 1
                elif result == "updated": updated += 1
                else: skipped += 1
            
            # 3. Seed LANG_RULES
            for lang, rule in LANG_RULES.items():
                key = f"lang_rule_{lang}"
                result = seed_prompt(key, rule, "language")
                if result == "inserted": inserted += 1
                elif result == "updated": updated += 1
                else: skipped += 1
            
            # 4. Seed HOME_PROMPTS
            for key, template in HOME_PROMPTS.items():
                result = seed_prompt(key, template, "home")
                if result == "inserted": inserted += 1
                elif result == "updated": updated += 1
                else: skipped += 1
            
            # 5. Seed INLINE_TEMPLATES (with template_ prefix in DB key)
            for key, template in INLINE_TEMPLATES.items():
                db_key = f"template_{key}"
                result = seed_prompt(db_key, template, "template")
                if result == "inserted": inserted += 1
                elif result == "updated": updated += 1
                else: skipped += 1
            
            # 6. Seed SERVICE_PROMPTS (with service_ prefix in DB key)
            for key, template in SERVICE_PROMPTS.items():
                db_key = f"service_{key}"
                result = seed_prompt(db_key, template, "service")
                if result == "inserted": inserted += 1
                elif result == "updated": updated += 1
                else: skipped += 1
            
            conn.commit()
            return {"inserted": inserted, "updated": updated, "skipped": skipped}
        finally:
            conn.close()
