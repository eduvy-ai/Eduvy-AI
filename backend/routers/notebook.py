from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import json
from database import get_db
from routers.auth import get_current_user

router = APIRouter()


def _require_own(user_id: str, current_user: str):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")


# --- Sources -------------------------------------------------

class Source(BaseModel):
    id: str
    name: str
    type: str = "text"
    content: str = ""
    icon: str = "??"
    added_at: int = 0


@router.get("/notebook/{user_id}/sources")
async def get_sources(user_id: str, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, type, content, icon, added_at FROM notebook_sources WHERE user_id = %s ORDER BY added_at ASC",
            (user_id,),
        )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.post("/notebook/{user_id}/sources", status_code=201)
async def add_source(user_id: str, data: Source, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO notebook_sources (id, user_id, name, type, content, icon, added_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (id, user_id) DO UPDATE
               SET name = EXCLUDED.name, content = EXCLUDED.content""",
            (data.id, user_id, data.name, data.type, data.content, data.icon, data.added_at),
        )
        conn.commit()
        return {"saved": True}
    finally:
        conn.close()


@router.delete("/notebook/{user_id}/sources/{source_id}")
async def delete_source(user_id: str, source_id: str, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM notebook_sources WHERE user_id = %s AND id = %s",
            (user_id, source_id),
        )
        conn.commit()
        return {"deleted": True}
    finally:
        conn.close()


@router.delete("/notebook/{user_id}/sources")
async def clear_sources(user_id: str, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM notebook_sources WHERE user_id = %s", (user_id,))
        conn.commit()
        return {"deleted": True}
    finally:
        conn.close()


# --- Chat -----------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: str


@router.get("/notebook/{user_id}/chat")
async def get_chat(user_id: str, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT role, content FROM notebook_chats WHERE user_id = %s ORDER BY id ASC",
            (user_id,),
        )
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


@router.post("/notebook/{user_id}/chat", status_code=201)
async def save_chat_message(user_id: str, data: ChatMessage, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO notebook_chats (user_id, role, content) VALUES (%s, %s, %s)",
            (user_id, data.role, data.content),
        )
        conn.commit()
        return {"saved": True}
    finally:
        conn.close()


@router.delete("/notebook/{user_id}/chat")
async def clear_chat(user_id: str, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM notebook_chats WHERE user_id = %s", (user_id,))
        conn.commit()
        return {"deleted": True}
    finally:
        conn.close()


# --- Studio outputs -------------------------------------------

class StudioOutput(BaseModel):
    type: str
    output_json: str   # serialized � could be text, JSON string, etc.


@router.get("/notebook/{user_id}/studio")
async def get_studio_outputs(user_id: str, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, type, output_json, created_at FROM studio_outputs WHERE user_id = %s ORDER BY id DESC LIMIT 20",
            (user_id,),
        )
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


@router.post("/notebook/{user_id}/studio", status_code=201)
async def save_studio_output(user_id: str, data: StudioOutput, current_user: str = Depends(get_current_user)):
    _require_own(user_id, current_user)
    conn = get_db()
    try:
        cur = conn.cursor()
        # Keep only last 10 outputs per user to avoid DB bloat
        cur.execute(
            """DELETE FROM studio_outputs WHERE user_id = %s AND id IN (
               SELECT id FROM studio_outputs WHERE user_id = %s ORDER BY id DESC OFFSET 9
            )""",
            (user_id, user_id),
        )
        cur.execute(
            "INSERT INTO studio_outputs (user_id, type, output_json) VALUES (%s, %s, %s)",
            (user_id, data.type, data.output_json),
        )
        conn.commit()
        return {"saved": True}
    finally:
        conn.close()
