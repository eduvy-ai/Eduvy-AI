from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import json
from database import get_db, row_to_dict
from routers.auth import get_current_user

router = APIRouter()

# ── IDOR guard ────────────────────────────────────────────────
def _require_own(user_id: str, current_user: str):
    """Raises 403 if the URL user_id does not match the authenticated user."""
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")


# --- Request models ------------------------------------------

class ProfileCreate(BaseModel):
    id: str
    name: str
    mobile: Optional[str] = ""
    parent_mobile: Optional[str] = ""
    standard: str = "Class 10"
    board: str = "CBSE"
    language: str = "English"
    subjects: List[str] = []


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    parent_mobile: Optional[str] = None
    standard: Optional[str] = None
    board: Optional[str] = None
    language: Optional[str] = None
    display_language: Optional[str] = None  # "english" or "medium"
    subjects: Optional[List[str]] = None
    school: Optional[str] = None


class XpRequest(BaseModel):
    points: int


class StreakRequest(BaseModel):
    streak: int


class AIConfigRequest(BaseModel):
    provider: str
    model: str
    apiKey: Optional[str] = ""
    aiKeys: Optional[dict] = None


# --- Endpoints -----------------------------------------------

@router.post("/profile", status_code=201)
async def create_profile(data: ProfileCreate):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s", (data.id,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Profile already exists")
        cur.execute(
            """INSERT INTO users
               (id, name, mobile, parent_mobile, standard, board, language, subjects)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data.id, data.name, data.mobile or "", data.parent_mobile or "",
                data.standard, data.board, data.language,
                json.dumps(data.subjects),
            ),
        )
        conn.commit()
        cur.execute("SELECT * FROM users WHERE id = %s", (data.id,))
        return row_to_dict(cur.fetchone())
    finally:
        conn.close()


@router.get("/profile/{user_id}")
async def get_profile(user_id: str, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")
        return row_to_dict(row)
    finally:
        conn.close()


@router.put("/profile/{user_id}")
async def update_profile(user_id: str, data: ProfileUpdate, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Profile not found")

        updates = {k: v for k, v in data.dict().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        if "subjects" in updates:
            updates["subjects"] = json.dumps(updates["subjects"])

        set_clause = ", ".join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [user_id]
        cur.execute(f"UPDATE users SET {set_clause} WHERE id = %s", values)
        conn.commit()
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return row_to_dict(cur.fetchone())
    finally:
        conn.close()


@router.post("/profile/{user_id}/xp")
async def add_xp(user_id: str, data: XpRequest, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    if data.points < 0 or data.points > 1000:
        raise HTTPException(status_code=400, detail="Invalid XP value")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT xp FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")
        new_xp = row["xp"] + data.points
        cur.execute("UPDATE users SET xp = %s WHERE id = %s", (new_xp, user_id))
        conn.commit()
        return {"xp": new_xp}
    finally:
        conn.close()


@router.put("/profile/{user_id}/streak")
async def update_streak(user_id: str, data: StreakRequest, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    if data.streak < 0 or data.streak > 36500:
        raise HTTPException(status_code=400, detail="Invalid streak value")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Profile not found")
        cur.execute(
            "UPDATE users SET streak = %s, last_active = CURRENT_DATE WHERE id = %s",
            (data.streak, user_id),
        )
        conn.commit()
        return {"streak": data.streak}
    finally:
        conn.close()


@router.put("/profile/{user_id}/ai-config")
async def update_ai_config(user_id: str, data: AIConfigRequest, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, ai_keys FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")

        # Merge per-provider keys: load existing, update with incoming
        existing_keys = {}
        try:
            existing_keys = json.loads(row.get("ai_keys") or "{}")
        except Exception:
            existing_keys = {}

        if data.aiKeys and isinstance(data.aiKeys, dict):
            existing_keys.update(data.aiKeys)
        elif data.apiKey:
            existing_keys[data.provider] = data.apiKey

        cur.execute(
            "UPDATE users SET ai_provider = %s, ai_model = %s, ai_key = %s, ai_keys = %s WHERE id = %s",
            (data.provider, data.model, data.apiKey or "", json.dumps(existing_keys), user_id),
        )
        conn.commit()
        return {"provider": data.provider, "model": data.model}
    finally:
        conn.close()
# NOTE: /profile/{user_id}/ai-keys endpoint removed — server manages all AI keys.
# Returning stored API keys to clients is a security risk.
