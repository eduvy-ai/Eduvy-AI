from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_db
from routers.auth import get_current_user
from fastapi import HTTPException

router = APIRouter()


def _require_own(user_id: str, current_user: str):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")


class QuizResult(BaseModel):
    subject: str
    difficulty: str = "Medium"
    correct: int   # 0 or 1 for a single question
    total: int = 1


@router.post("/quiz/{user_id}/result", status_code=201)
async def save_quiz_result(user_id: str, data: QuizResult, current_user: str = Depends(get_current_user)):
    """Save one quiz answer result."""
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO quiz_results (user_id, subject, difficulty, correct, total)
               VALUES (%s, %s, %s, %s, %s)""",
            (user_id, data.subject, data.difficulty, data.correct, data.total),
        )
        conn.commit()
        return {"saved": True}
    finally:
        conn.close()


@router.get("/quiz/{user_id}/stats")
async def get_quiz_stats(user_id: str, current_user: str = Depends(get_current_user)):
    """Returns per-subject stats: { subject: { total, correct, accuracy } }"""
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
            (user_id,),
        )
        rows = cur.fetchall()
        result = {}
        for row in rows:
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
