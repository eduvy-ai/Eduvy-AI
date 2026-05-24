"""
Mastery Service - Business logic for subject mastery.
"""
from typing import Dict
from fastapi import HTTPException

from app.db.connection import get_db


def _require_own(user_id: str, current_user: str):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")


class MasteryService:
    """Mastery business logic."""
    
    @staticmethod
    def get_mastery(user_id: str, current_user: str) -> Dict[str, int]:
        """Get all mastery scores for user."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT subject, score FROM mastery WHERE user_id = %s", (user_id,)
            )
            return {row["subject"]: row["score"] for row in cur.fetchall()}
        finally:
            conn.close()
    
    @staticmethod
    def set_mastery(user_id: str, current_user: str, subject: str, score: int) -> Dict:
        """Upsert mastery score for one subject."""
        _require_own(user_id, current_user)
        if not 0 <= score <= 100:
            raise HTTPException(status_code=400, detail="Score must be 0–100")
        
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO mastery (user_id, subject, score, updated_at)
                   VALUES (%s, %s, %s, CURRENT_DATE)
                   ON CONFLICT (user_id, subject)
                   DO UPDATE SET score = EXCLUDED.score, updated_at = CURRENT_DATE""",
                (user_id, subject, score)
            )
            conn.commit()
            return {"subject": subject, "score": score}
        finally:
            conn.close()
