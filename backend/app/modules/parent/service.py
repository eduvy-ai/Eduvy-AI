"""
Parent Service - Business logic for parent dashboard PINs.
"""
import secrets
import string
from typing import Dict, Optional
from fastapi import HTTPException

from app.db.connection import get_db

PIN_CHARS = string.ascii_uppercase + string.digits
PIN_LEN = 8


def _gen_pin() -> str:
    return "".join(secrets.choice(PIN_CHARS) for _ in range(PIN_LEN))


class ParentService:
    """Parent dashboard business logic."""
    
    @staticmethod
    def create_or_refresh_pin(user_id: str) -> Dict:
        """Generate a new PIN (revokes old one if any)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM parent_pins WHERE user_id = %s", (user_id,))
            pin = _gen_pin()
            
            for _ in range(5):
                try:
                    cur.execute("""
                        INSERT INTO parent_pins (user_id, pin)
                        VALUES (%s, %s)
                        RETURNING pin, expires_at
                    """, (user_id, pin))
                    row = cur.fetchone()
                    conn.commit()
                    return {"pin": row["pin"], "expires_at": str(row["expires_at"])}
                except Exception:
                    pin = _gen_pin()
                    conn.rollback()
            
            raise HTTPException(status_code=500, detail="Could not generate PIN")
        finally:
            conn.close()
    
    @staticmethod
    def get_my_pin(user_id: str) -> Dict:
        """Get current PIN for user."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT pin, expires_at, created_at
                FROM parent_pins
                WHERE user_id = %s AND expires_at > NOW()
                ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return {"pin": None, "expires_at": None}
            return {"pin": row["pin"], "expires_at": str(row["expires_at"])}
        finally:
            conn.close()
    
    @staticmethod
    def revoke_pin(user_id: str) -> Dict:
        """Revoke user's PIN."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM parent_pins WHERE user_id = %s", (user_id,))
            conn.commit()
            return {"revoked": True}
        finally:
            conn.close()
    
    @staticmethod
    def view_child_dashboard(pin: str) -> Dict:
        """Public view of child dashboard by PIN."""
        if len(pin) != PIN_LEN or not all(c in PIN_CHARS for c in pin.upper()):
            raise HTTPException(status_code=404, detail="Invalid PIN")
        
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Validate PIN
            cur.execute("""
                SELECT user_id FROM parent_pins
                WHERE pin = %s AND expires_at > NOW()
            """, (pin.upper(),))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="PIN not found or expired")
            
            user_id = row["user_id"]
            
            # Get user info
            cur.execute("""
                SELECT id, name, standard, xp, streak, language
                FROM users WHERE id = %s
            """, (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="Student not found")
            
            # Get mastery scores
            cur.execute("SELECT subject, score FROM mastery WHERE user_id = %s", (user_id,))
            mastery = {r["subject"]: r["score"] for r in cur.fetchall()}
            
            # Get quiz stats
            cur.execute("""
                SELECT subject, SUM(total) AS total, SUM(correct) AS correct
                FROM quiz_results WHERE user_id = %s GROUP BY subject
            """, (user_id,))
            quiz_stats = {}
            for r in cur.fetchall():
                total = r["total"] or 0
                correct = r["correct"] or 0
                quiz_stats[r["subject"]] = {
                    "total": total,
                    "correct": correct,
                    "accuracy": round((correct / total) * 100) if total else 0
                }
            
            return {
                "student": dict(user),
                "mastery": mastery,
                "quiz_stats": quiz_stats
            }
        finally:
            conn.close()
