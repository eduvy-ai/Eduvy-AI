from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_db
from routers.auth import get_current_user

router = APIRouter()


def _require_own(user_id: str, current_user: str):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")


# ─── Chat Sessions (TutorTab per-mode, MentalLab) ────────────

class ChatMsg(BaseModel):
    role: str
    content: str


@router.get("/chat-session/{user_id}/{session}")
async def get_session(user_id: str, session: str, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT role, content FROM chat_sessions WHERE user_id = %s AND session = %s ORDER BY id ASC",
            (user_id, session),
        )
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


@router.post("/chat-session/{user_id}/{session}", status_code=201)
async def append_message(user_id: str, session: str, data: ChatMsg, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        # Keep at most 100 messages per session — trim oldest
        cur.execute(
            """DELETE FROM chat_sessions WHERE user_id = %s AND session = %s AND id IN (
               SELECT id FROM chat_sessions WHERE user_id = %s AND session = %s
               ORDER BY id ASC OFFSET 99
            )""",
            (user_id, session, user_id, session),
        )
        cur.execute(
            "INSERT INTO chat_sessions (user_id, session, role, content) VALUES (%s, %s, %s, %s)",
            (user_id, session, data.role, data.content),
        )
        conn.commit()
        return {"saved": True}
    finally:
        conn.close()


@router.delete("/chat-session/{user_id}/{session}")
async def clear_session(user_id: str, session: str, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM chat_sessions WHERE user_id = %s AND session = %s",
            (user_id, session),
        )
        conn.commit()
        return {"deleted": True}
    finally:
        conn.close()


# ─── User Drafts (EssayLab, VideosTab, PodcastLab) ───────────

class Draft(BaseModel):
    content: str
    extra: str = ""


@router.get("/draft/{user_id}/{key}")
async def get_draft(user_id: str, key: str, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT content, extra FROM user_drafts WHERE user_id = %s AND draft_key = %s",
            (user_id, key),
        )
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


@router.put("/draft/{user_id}/{key}")
async def save_draft(user_id: str, key: str, data: Draft, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO user_drafts (user_id, draft_key, content, extra)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (user_id, draft_key) DO UPDATE
               SET content = EXCLUDED.content,
                   extra = EXCLUDED.extra,
                   updated_at = CURRENT_TIMESTAMP""",
            (user_id, key, data.content, data.extra),
        )
        conn.commit()
        return {"saved": True}
    finally:
        conn.close()
