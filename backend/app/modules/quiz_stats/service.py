"""
Quiz Stats Service - Business logic for quiz results.
"""
from typing import Dict
from fastapi import HTTPException

from app.db.connection import get_db


def _require_own(user_id: str, current_user: str):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")


class QuizStatsService:
    """Quiz stats business logic."""
    
    @staticmethod
    def save_result(
        user_id: str,
        current_user: str,
        subject: str,
        difficulty: str,
        correct: int,
        total: int
    ) -> Dict:
        """Save a quiz result."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO quiz_results (user_id, subject, difficulty, correct, total)
                   VALUES (%s, %s, %s, %s, %s)""",
                (user_id, subject, difficulty, correct, total)
            )
            conn.commit()
            return {"saved": True}
        finally:
            conn.close()
    
    @staticmethod
    def get_stats(user_id: str, current_user: str) -> Dict:
        """Get per-subject quiz stats."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT subject,
                          SUM(total)   AS total,
                          SUM(correct) AS correct
                   FROM quiz_results
                   WHERE user_id = %s
                   GROUP BY subject""",
                (user_id,)
            )
            result = {}
            for row in cur.fetchall():
                total = row["total"] or 0
                correct = row["correct"] or 0
                result[row["subject"]] = {
                    "total": total,
                    "correct": correct,
                    "accuracy": round((correct / total) * 100) if total else 0,
                }
            return result
        finally:
            conn.close()
