"""
drishti.py ΓÇö Drishti Vision-Accessible Learning helper portal API.

Authentication: X-Helper-Token header (UUID issued at helper creation ΓÇö no password needed).

GET    /api/helper/me                      ΓåÆ verify token, return helper info
GET    /api/helper/students                ΓåÆ assigned students with XP, streak, last active
POST   /api/helper/notes                   ΓåÆ send encouragement note to a student
GET    /api/helper/notes/{student_id}      ΓåÆ note history for a specific student

Student-facing (auth via Bearer token):
GET    /api/profile/{id}/helper-notes      ΓåÆ unread notes for this student
POST   /api/profile/{id}/helper-notes/read ΓåÆ mark all notes read
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
import os

from database import get_db

router = APIRouter()

_bearer = HTTPBearer(auto_error=False)
_JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


# ΓöÇΓöÇ Auth helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

def _get_helper(x_helper_token: Optional[str] = Header(default=None, alias="X-Helper-Token")):
    """Dependency: verify helper token from request header."""
    if not x_helper_token:
        raise HTTPException(status_code=401, detail="X-Helper-Token header required")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM drishti_helpers WHERE helper_token=%s AND is_active=TRUE",
            (x_helper_token,),
        )
        helper = cur.fetchone()
        if not helper:
            raise HTTPException(status_code=401, detail="Invalid or inactive helper token")
        return dict(helper)
    finally:
        conn.close()


def _get_student_id_from_token(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Dependency: verify student Bearer JWT, return user_id."""
    if not creds:
        raise HTTPException(status_code=401, detail="Auth required")
    try:
        payload = jwt.decode(creds.credentials, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


# ΓöÇΓöÇ Request models ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

class NoteCreate(BaseModel):
    student_id: str
    message: str


# ΓöÇΓöÇ Helper portal endpoints ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

@router.get("/helper/me")
def helper_me(helper: dict = Depends(_get_helper)):
    """Return helper profile (no token in response)."""
    return {
        "id":           helper["id"],
        "helper_name":  helper["helper_name"],
        "helper_email": helper["helper_email"],
        "helper_type":  helper["helper_type"],
        "notes":        helper["notes"],
        "created_at":   str(helper["created_at"]),
    }


@router.get("/helper/students")
def helper_students(helper: dict = Depends(_get_helper)):
    """Return all students assigned to this helper with progress info."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT u.id, u.name, u.standard, u.board, u.language,
                   u.xp, u.streak, u.last_active, u.plan,
                   m.assigned_at
            FROM helper_student_map m
            JOIN users u ON u.id = m.student_id
            WHERE m.helper_id = %s
            ORDER BY m.assigned_at DESC
        """, (helper["id"],))
        students = []
        for row in cur.fetchall():
            d = dict(row)
            d["assigned_at"] = str(d["assigned_at"])
            # Fetch today's study topics (last 5 chat sessions)
            cur.execute("""
                SELECT DISTINCT session AS topic
                FROM chat_sessions
                WHERE user_id = %s
                ORDER BY topic DESC
                LIMIT 5
            """, (d["id"],))
            d["recent_topics"] = [r["topic"] for r in cur.fetchall()]
            students.append(d)
        return students
    finally:
        conn.close()


@router.post("/helper/notes", status_code=201)
def helper_send_note(data: NoteCreate, helper: dict = Depends(_get_helper)):
    """Send an encouragement note to one of the helper's assigned students."""
    if not data.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    if len(data.message) > 500:
        raise HTTPException(status_code=422, detail="Message too long (max 500 chars)")

    conn = get_db()
    try:
        cur = conn.cursor()
        # Verify this student is actually assigned to this helper
        cur.execute(
            "SELECT 1 FROM helper_student_map WHERE helper_id=%s AND student_id=%s",
            (helper["id"], data.student_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Student not assigned to you")
        cur.execute(
            """INSERT INTO helper_notes (helper_id, student_id, message)
               VALUES (%s,%s,%s) RETURNING id, created_at""",
            (helper["id"], data.student_id, data.message.strip()),
        )
        row = cur.fetchone()
        conn.commit()
        return {"id": row["id"], "ok": True, "created_at": str(row["created_at"])}
    finally:
        conn.close()


@router.get("/helper/notes/{student_id}")
def helper_note_history(student_id: str, helper: dict = Depends(_get_helper)):
    """Return all notes this helper has sent to a specific student."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM helper_student_map WHERE helper_id=%s AND student_id=%s",
            (helper["id"], student_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Student not assigned to you")
        cur.execute("""
            SELECT id, message, (read_at IS NOT NULL) AS is_read, created_at
            FROM helper_notes
            WHERE helper_id=%s AND student_id=%s
            ORDER BY created_at DESC
            LIMIT 50
        """, (helper["id"], student_id))
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


# ΓöÇΓöÇ Student-facing note endpoints (Bearer auth) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

@router.get("/profile/{student_id}/helper-notes")
def student_get_notes(
    student_id: str,
    user_id: str = Depends(_get_student_id_from_token),
):
    """Student reads their unread helper notes."""
    if user_id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT n.id, n.message, (n.read_at IS NOT NULL) AS is_read, n.created_at,
                   h.helper_name, h.helper_type
            FROM helper_notes n
            JOIN drishti_helpers h ON h.id = n.helper_id
            WHERE n.student_id = %s AND n.read_at IS NULL
            ORDER BY n.created_at DESC
            LIMIT 20
        """, (student_id,))
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


@router.post("/profile/{student_id}/helper-notes/read")
def student_mark_notes_read(
    student_id: str,
    user_id: str = Depends(_get_student_id_from_token),
):
    """Mark all helper notes for this student as read."""
    if user_id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE helper_notes SET read_at=CURRENT_TIMESTAMP WHERE student_id=%s AND read_at IS NULL",
            (student_id,),
        )
        conn.commit()
        return {"ok": True, "marked": cur.rowcount}
    finally:
        conn.close()
