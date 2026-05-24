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
                "INSERT INTO admin_users (email, password_hash, name, role) VALUES (%s,%s,%s,'superadmin') RETURNING id",
                (email, pw_hash, name.strip())
            )
            new_id = cur.fetchone()["id"]
            conn.commit()
            
            token = _make_admin_token(new_id)
            return {"token": token, "email": email, "name": name.strip()}
        finally:
            conn.close()
    
    @staticmethod
    def login(email: str, password: str) -> Dict:
        """Admin login."""
        conn = get_db()
        try:
            cur = conn.cursor()
            email = email.strip().lower()
            cur.execute("SELECT * FROM admin_users WHERE email = %s", (email,))
            admin = cur.fetchone()
            if not admin or not _verify(password, admin["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            token = _make_admin_token(admin["id"])
            return {"token": token, "email": admin["email"], "name": admin["name"]}
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
            return dict(row)
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
            cur.execute("UPDATE boards SET is_active=FALSE WHERE id=%s", (board_id,))
            conn.commit()
            return {"ok": True}
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
            cur.execute("UPDATE standards SET is_active=FALSE WHERE id=%s", (std_id,))
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
            cur.execute("UPDATE mediums SET is_active=FALSE WHERE id=%s", (med_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()
