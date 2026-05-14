"""
squads.py — Sathi Study Squads endpoints.

GET    /api/squads/mine                            → get user's active squad (or null)
POST   /api/squads/match                           → AI-match into a squad
GET    /api/squads/{id}/messages?since_id=0        → poll for new messages
POST   /api/squads/{id}/messages                   → send a message
GET    /api/squads/{id}/members                    → member list with online status
GET    /api/squads/{id}/challenge                  → get active teach-challenge for user
POST   /api/squads/{id}/challenge/create           → AI generates a challenge from strong subject
POST   /api/squads/{id}/challenge/{cid}/submit     → submit explanation, earn Teaching XP
DELETE /api/squads/{id}/leave                      → leave the squad
"""
import random
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database import get_db
from routers.auth import get_current_user

router = APIRouter()

SQUAD_MAX_SIZE = 4
TEACHING_XP_REWARD = 50   # XP awarded for completing a teach-challenge

# Concept banks used when generating challenges
_CONCEPTS = {
    "Mathematics":  ["Quadratic Equations", "Trigonometry ratios", "Polynomials",
                     "Coordinate Geometry", "Statistics & Probability", "Circles",
                     "Arithmetic Progressions", "Similar Triangles"],
    "Science":      ["Laws of Motion", "Electricity", "Chemical Reactions",
                     "Heredity & Evolution", "Light – Reflection & Refraction",
                     "Life Processes", "Magnetic Effects of Current"],
    "Physics":      ["Newton's Laws", "Optics", "Current Electricity",
                     "Gravitation", "Waves & Sound", "Work & Energy"],
    "Chemistry":    ["Acids, Bases and Salts", "Carbon Compounds",
                     "Metals and Non-metals", "Periodic Table", "Chemical Bonding"],
    "Biology":      ["Photosynthesis", "Human Digestive System", "DNA & Heredity",
                     "Nervous System", "Ecosystems", "Cell Division"],
    "History":      ["Nationalism in India", "World War Causes", "Industrial Revolution",
                     "French Revolution", "Mughal Empire"],
    "Geography":    ["Monsoons", "Natural Vegetation", "Mineral Resources",
                     "Agriculture in India", "Water Resources"],
    "English":      ["Tense Forms", "Passive Voice", "Reading Comprehension",
                     "Essay Structure", "Letter Writing"],
}
_DEFAULT_CONCEPTS = ["Key Concepts", "Core Principles", "Important Definitions",
                     "Problem-Solving Strategies", "Common Exam Topics"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_squad_for_user(cur, user_id: str) -> Optional[dict]:
    cur.execute("""
        SELECT s.id, s.name, s.focus_subject,
               s.created_at::text AS created_at
        FROM squads s
        JOIN squad_members sm ON sm.squad_id = s.id
        WHERE sm.user_id = %s AND s.is_active = TRUE
        ORDER BY sm.joined_at DESC
        LIMIT 1
    """, (user_id,))
    row = cur.fetchone()
    return dict(row) if row else None


def _require_member(cur, squad_id: int, user_id: str):
    cur.execute(
        "SELECT 1 FROM squad_members WHERE squad_id = %s AND user_id = %s",
        (squad_id, user_id),
    )
    if not cur.fetchone():
        raise HTTPException(status_code=403, detail="Not a member of this squad")


def _get_mastery(cur, user_id: str) -> dict:
    cur.execute("SELECT subject, score FROM mastery WHERE user_id = %s", (user_id,))
    return {r["subject"]: r["score"] for r in cur.fetchall()}


def _get_name(cur, user_id: str) -> str:
    cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    return row["name"] if row else "Student"


def _sys_msg(cur, squad_id: int, user_id: str, text: str):
    """Insert a system message into the squad chat."""
    cur.execute(
        "INSERT INTO squad_messages (squad_id, user_id, display_name, content, msg_type)"
        " VALUES (%s, %s, 'System', %s, 'system')",
        (squad_id, user_id, text),
    )


# ── Request models ────────────────────────────────────────────────────────────

class SendMessage(BaseModel):
    content: str
    display_name: str = "Student"
    msg_type: str = "chat"


class SubmitExplanation(BaseModel):
    explanation: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/squads/mine")
async def get_my_squad(current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        squad = _get_squad_for_user(cur, current_user)
        if not squad:
            return {"squad": None}

        sid = squad["id"]

        # Members list
        cur.execute("""
            SELECT sm.user_id, sm.role,
                   sm.last_seen_at::text AS last_seen_at,
                   u.name, u.standard
            FROM squad_members sm
            JOIN users u ON u.id = sm.user_id
            WHERE sm.squad_id = %s
        """, (sid,))
        members = [dict(r) for r in cur.fetchall()]

        # Message count
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM squad_messages WHERE squad_id = %s", (sid,)
        )
        msg_count = cur.fetchone()["cnt"]

        return {"squad": {**squad, "members": members, "message_count": msg_count}}
    finally:
        conn.close()


@router.post("/squads/match")
async def match_squad(current_user: str = Depends(get_current_user)):
    """Find a complementary squad based on mastery scores, or create a new one."""
    conn = get_db()
    try:
        cur = conn.cursor()

        # Already in a squad?
        existing = _get_squad_for_user(cur, current_user)
        if existing:
            return {"squad_id": existing["id"], "status": "already_matched"}

        my_name    = _get_name(cur, current_user)
        my_mastery = _get_mastery(cur, current_user)

        # Determine weak + strong subjects
        weak_subject   = None
        strong_subject = None
        if my_mastery:
            weak_subject   = min(my_mastery, key=my_mastery.get)
            strong_subject = max(my_mastery, key=my_mastery.get)

        focus = weak_subject or "General"

        # Try to join an open squad that focuses on this subject
        matched_id = None
        cur.execute("""
            SELECT s.id, COUNT(sm.user_id) AS cnt
            FROM squads s
            JOIN squad_members sm ON sm.squad_id = s.id
            WHERE s.is_active = TRUE AND s.focus_subject = %s
            GROUP BY s.id
            HAVING COUNT(sm.user_id) < %s
            ORDER BY cnt DESC
            LIMIT 1
        """, (focus, SQUAD_MAX_SIZE))
        row = cur.fetchone()
        if row:
            matched_id = row["id"]

        if matched_id:
            cur.execute(
                "INSERT INTO squad_members (squad_id, user_id, role)"
                " VALUES (%s, %s, 'learner') ON CONFLICT DO NOTHING",
                (matched_id, current_user),
            )
            _sys_msg(cur, matched_id, current_user,
                     f"🎉 {my_name} joined the squad! Say hi 👋")
            conn.commit()
            return {"squad_id": matched_id, "status": "joined"}

        # Create new squad
        cur.execute(
            "INSERT INTO squads (name, focus_subject) VALUES (%s, %s) RETURNING id",
            (f"{my_name}'s Squad", focus),
        )
        new_id = cur.fetchone()["id"]
        role = "learner" if (my_mastery.get(focus, 50) < 50) else "teacher"
        cur.execute(
            "INSERT INTO squad_members (squad_id, user_id, role) VALUES (%s, %s, %s)",
            (new_id, current_user, role),
        )
        _sys_msg(cur, new_id, current_user,
                 f"🚀 Squad created — focus: {focus}. Waiting for study partners to join...")
        conn.commit()
        return {"squad_id": new_id, "status": "created"}
    finally:
        conn.close()


@router.get("/squads/{squad_id}/messages")
async def get_messages(
    squad_id: int,
    since_id: int = 0,
    current_user: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)

        # Refresh last_seen
        cur.execute(
            "UPDATE squad_members SET last_seen_at = CURRENT_TIMESTAMP"
            " WHERE squad_id = %s AND user_id = %s",
            (squad_id, current_user),
        )
        conn.commit()

        cur.execute("""
            SELECT id, user_id, display_name, content, msg_type,
                   created_at::text AS created_at
            FROM squad_messages
            WHERE squad_id = %s AND id > %s
            ORDER BY id ASC
            LIMIT 60
        """, (squad_id, since_id))
        return {"messages": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


@router.post("/squads/{squad_id}/messages", status_code=201)
async def send_message(
    squad_id: int,
    data: SendMessage,
    current_user: str = Depends(get_current_user),
):
    content = data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars)")

    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)
        cur.execute(
            "INSERT INTO squad_messages"
            " (squad_id, user_id, display_name, content, msg_type)"
            " VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (squad_id, current_user, data.display_name, content, data.msg_type),
        )
        msg_id = cur.fetchone()["id"]
        conn.commit()
        return {"saved": True, "id": msg_id}
    finally:
        conn.close()


@router.get("/squads/{squad_id}/members")
async def get_members(
    squad_id: int,
    current_user: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)
        cur.execute("""
            SELECT sm.user_id, sm.role,
                   sm.last_seen_at::text AS last_seen_at,
                   u.name, u.standard
            FROM squad_members sm
            JOIN users u ON u.id = sm.user_id
            WHERE sm.squad_id = %s
        """, (squad_id,))
        members = [dict(r) for r in cur.fetchall()]
        # Mark who is "online" (last_seen within 3 minutes)
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=3)).isoformat()
        for m in members:
            ls = m.get("last_seen_at") or ""
            m["online"] = ls >= cutoff
        return {"members": members}
    finally:
        conn.close()


@router.get("/squads/{squad_id}/challenge")
async def get_challenge(
    squad_id: int,
    current_user: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)
        cur.execute("""
            SELECT id, squad_id, teacher_user_id, subject, concept,
                   status, explanation, xp_awarded,
                   created_at::text AS created_at
            FROM squad_challenges
            WHERE squad_id = %s AND teacher_user_id = %s AND status = 'pending'
            ORDER BY created_at DESC
            LIMIT 1
        """, (squad_id, current_user))
        row = cur.fetchone()
        return {"challenge": dict(row) if row else None}
    finally:
        conn.close()


@router.post("/squads/{squad_id}/challenge/create")
async def create_challenge(
    squad_id: int,
    current_user: str = Depends(get_current_user),
):
    """Generate a teach-this challenge from the user's strongest subject."""
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)

        mastery = _get_mastery(cur, current_user)
        if not mastery:
            raise HTTPException(
                status_code=400,
                detail="No mastery data yet — complete some quizzes first",
            )

        strong_subj = max(mastery, key=mastery.get)
        concepts    = _CONCEPTS.get(strong_subj, _DEFAULT_CONCEPTS)
        concept     = random.choice(concepts)

        cur.execute("""
            INSERT INTO squad_challenges (squad_id, teacher_user_id, subject, concept)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (squad_id, current_user, strong_subj, concept))
        ch_id = cur.fetchone()["id"]

        name = _get_name(cur, current_user)
        _sys_msg(cur, squad_id, current_user,
                 f"📚 Challenge! {name} will explain '{concept}' to the squad. "
                 f"50 Teaching XP at stake! 🏆")
        conn.commit()
        return {"challenge_id": ch_id, "subject": strong_subj, "concept": concept}
    finally:
        conn.close()


@router.post("/squads/{squad_id}/challenge/{challenge_id}/submit")
async def submit_challenge(
    squad_id: int,
    challenge_id: int,
    data: SubmitExplanation,
    current_user: str = Depends(get_current_user),
):
    explanation = data.explanation.strip()
    if not explanation:
        raise HTTPException(status_code=400, detail="Explanation required")

    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)

        cur.execute("""
            SELECT id FROM squad_challenges
            WHERE id = %s AND squad_id = %s
              AND teacher_user_id = %s AND status = 'pending'
        """, (challenge_id, squad_id, current_user))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Challenge not found or already completed")

        cur.execute("""
            UPDATE squad_challenges
            SET status = 'completed', explanation = %s, xp_awarded = %s
            WHERE id = %s
        """, (explanation, TEACHING_XP_REWARD, challenge_id))

        # Award Teaching XP
        cur.execute(
            "UPDATE users SET xp = xp + %s WHERE id = %s",
            (TEACHING_XP_REWARD, current_user),
        )

        name = _get_name(cur, current_user)
        _sys_msg(cur, squad_id, current_user,
                 f"🎓 {name} completed the challenge and earned {TEACHING_XP_REWARD} Teaching XP!")
        conn.commit()
        return {"completed": True, "xp_awarded": TEACHING_XP_REWARD}
    finally:
        conn.close()


@router.delete("/squads/{squad_id}/leave")
async def leave_squad(
    squad_id: int,
    current_user: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)
        name = _get_name(cur, current_user)

        cur.execute(
            "DELETE FROM squad_members WHERE squad_id = %s AND user_id = %s",
            (squad_id, current_user),
        )
        _sys_msg(cur, squad_id, current_user, f"👋 {name} left the squad.")

        # Deactivate squad if empty
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM squad_members WHERE squad_id = %s", (squad_id,)
        )
        if cur.fetchone()["cnt"] == 0:
            cur.execute("UPDATE squads SET is_active = FALSE WHERE id = %s", (squad_id,))

        conn.commit()
        return {"left": True}
    finally:
        conn.close()
