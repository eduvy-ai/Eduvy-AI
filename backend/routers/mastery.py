from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_db
from routers.auth import get_current_user

router = APIRouter()


def _require_own(user_id: str, current_user: str):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")


class MasteryUpdate(BaseModel):
    subject: str
    score: int   # 0–100


@router.get("/mastery/{user_id}")
async def get_mastery(user_id: str, current_user: str = Depends(get_current_user)):
    """Returns { subject: score } map for all subjects of a user."""
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT subject, score FROM mastery WHERE user_id = %s", (user_id,)
        )
        rows = cur.fetchall()
        return {row["subject"]: row["score"] for row in rows}
    finally:
        conn.close()


@router.put("/mastery/{user_id}")
async def set_mastery(user_id: str, data: MasteryUpdate, current_user: str = Depends(get_current_user)):
    """Upsert mastery score for one subject."""
    _require_own(user_id, current_user)
    if not 0 <= data.score <= 100:
        raise HTTPException(status_code=400, detail="Score must be 0–100")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO mastery (user_id, subject, score, updated_at)
               VALUES (%s, %s, %s, CURRENT_DATE)
               ON CONFLICT (user_id, subject)
               DO UPDATE SET score = EXCLUDED.score, updated_at = CURRENT_DATE""",
            (user_id, data.subject, data.score),
        )
        conn.commit()
        return {"subject": data.subject, "score": data.score}
    finally:
        conn.close()
