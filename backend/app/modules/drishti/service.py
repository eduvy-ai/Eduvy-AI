"""
Drishti Service - Business logic for helper portal.
"""
import os
from typing import Dict, List, Optional
from fastapi import HTTPException, Header
from jose import JWTError, jwt

from app.db.connection import get_db

_JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


class DrishtiService:
    """Drishti helper portal business logic."""
    
    @staticmethod
    def get_helper(helper_token: str) -> Dict:
        """Validate helper token and return helper info."""
        if not helper_token:
            raise HTTPException(status_code=401, detail="X-Helper-Token required")
        
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM drishti_helpers WHERE helper_token=%s AND is_active=TRUE",
                (helper_token,)
            )
            helper = cur.fetchone()
            if not helper:
                raise HTTPException(status_code=401, detail="Invalid or inactive helper token")
            return dict(helper)
        finally:
            conn.close()
    
    @staticmethod
    def get_helper_me(helper: Dict) -> Dict:
        """Return helper profile."""
        return {
            "id": helper["id"],
            "helper_name": helper["helper_name"],
            "helper_email": helper["helper_email"],
            "helper_type": helper["helper_type"],
            "notes": helper.get("notes", ""),
            "created_at": str(helper["created_at"]),
        }
    
    @staticmethod
    def get_students(helper: Dict) -> List[Dict]:
        """Get students assigned to helper."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT u.id, u.name, u.standard, u.board, u.language,
                       u.xp, u.streak, u.last_active, u.plan
                FROM users u
                JOIN drishti_assignments da ON da.student_id = u.id
                WHERE da.helper_id = %s AND da.is_active = TRUE
                ORDER BY u.name
            """, (helper["id"],))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def send_note(helper: Dict, student_id: str, message: str) -> Dict:
        """Send encouragement note to student."""
        if not message.strip():
            raise HTTPException(status_code=400, detail="Message required")
        if len(message) > 500:
            raise HTTPException(status_code=400, detail="Message too long (max 500 chars)")
        
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Verify assignment
            cur.execute(
                "SELECT 1 FROM drishti_assignments WHERE helper_id = %s AND student_id = %s AND is_active = TRUE",
                (helper["id"], student_id)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Not assigned to this student")
            
            cur.execute(
                """INSERT INTO drishti_notes (helper_id, student_id, message)
                   VALUES (%s, %s, %s) RETURNING id, created_at""",
                (helper["id"], student_id, message.strip())
            )
            row = cur.fetchone()
            conn.commit()
            
            return {"id": row["id"], "created_at": str(row["created_at"])}
        finally:
            conn.close()
    
    @staticmethod
    def get_notes_for_student(helper: Dict, student_id: str) -> List[Dict]:
        """Get notes sent to a student."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, message, created_at, is_read
                FROM drishti_notes
                WHERE helper_id = %s AND student_id = %s
                ORDER BY created_at DESC
            """, (helper["id"], student_id))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def get_student_notes(student_id: str) -> List[Dict]:
        """Get unread notes for a student."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT n.id, n.message, n.created_at, h.helper_name
                FROM drishti_notes n
                JOIN drishti_helpers h ON h.id = n.helper_id
                WHERE n.student_id = %s AND n.is_read = FALSE
                ORDER BY n.created_at DESC
            """, (student_id,))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def mark_notes_read(student_id: str) -> Dict:
        """Mark all notes as read for a student."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE drishti_notes SET is_read = TRUE WHERE student_id = %s AND is_read = FALSE",
                (student_id,)
            )
            conn.commit()
            return {"marked": cur.rowcount}
        finally:
            conn.close()
