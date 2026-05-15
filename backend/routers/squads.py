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
    xp_override: Optional[int] = None   # 5 | 15 | 30 — set by frontend AI review
    ai_verdict:  Optional[str] = None   # "correct" | "partial" | "incorrect"
    ai_note:     Optional[str] = None   # one-sentence AI feedback


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

        # Get student's standard and language (medium) for matching
        cur.execute("SELECT standard, language FROM users WHERE id = %s", (current_user,))
        user_row   = cur.fetchone()
        my_standard = (user_row["standard"] if user_row else None) or "Class 10"
        my_medium   = (user_row["language"] if user_row else None) or "English"

        # Determine weak + strong subjects
        weak_subject   = None
        strong_subject = None
        if my_mastery:
            weak_subject   = min(my_mastery, key=my_mastery.get)
            strong_subject = max(my_mastery, key=my_mastery.get)

        focus = weak_subject or "General"

        # Try to join an open squad matching same subject + standard + medium
        matched_id = None
        cur.execute("""
            SELECT s.id, COUNT(sm.user_id) AS cnt
            FROM squads s
            JOIN squad_members sm ON sm.squad_id = s.id
            WHERE s.is_active = TRUE
              AND s.focus_subject = %s
              AND s.standard = %s
              AND s.medium = %s
            GROUP BY s.id
            HAVING COUNT(sm.user_id) < %s
            ORDER BY cnt DESC
            LIMIT 1
        """, (focus, my_standard, my_medium, SQUAD_MAX_SIZE))
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

        # Create new squad with standard + medium so future students match correctly
        cur.execute(
            "INSERT INTO squads (name, focus_subject, standard, medium) VALUES (%s, %s, %s, %s) RETURNING id",
            (f"{my_name}'s Squad", focus, my_standard, my_medium),
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
        if mastery:
            strong_subj = max(mastery, key=mastery.get)
            concepts    = _CONCEPTS.get(strong_subj, _DEFAULT_CONCEPTS)
        else:
            # No quiz data yet — pick a random subject from the bank
            strong_subj = random.choice(list(_CONCEPTS.keys()))
            concepts    = _CONCEPTS[strong_subj]
        concept = random.choice(concepts)

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

    word_count = len(explanation.split())
    if len(explanation) < 60 or word_count < 15:
        raise HTTPException(
            status_code=400,
            detail=f"Explanation too short ({word_count} words). Write at least 15 words to earn Teaching XP.",
        )

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


# ═══════════════════════════════════════════════════════════════
# DOUBTS BOARD
# ═══════════════════════════════════════════════════════════════

class PostDoubt(BaseModel):
    question: str
    display_name: str = "Student"
    subject: str = ""

class PostAnswer(BaseModel):
    answer: str
    display_name: str = "Student"

ANSWER_HELP_XP = 15   # XP for getting your answer upvoted


def _bump_squad_streak(cur, squad_id: int):
    """Increment squad streak if it's a new calendar day."""
    from datetime import date
    today = date.today()
    cur.execute("SELECT streak, last_active_date FROM squads WHERE id = %s", (squad_id,))
    row = cur.fetchone()
    if not row:
        return
    last = row["last_active_date"]
    if last is None or last < today:
        from datetime import timedelta
        new_streak = (row["streak"] + 1) if (last and last >= today - timedelta(days=1)) else 1
        cur.execute(
            "UPDATE squads SET streak = %s, last_active_date = %s WHERE id = %s",
            (new_streak, today, squad_id),
        )


@router.get("/squads/{squad_id}/doubts")
async def get_doubts(squad_id: int, current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)
        cur.execute("""
            SELECT d.id, d.user_id, d.display_name, d.question, d.subject,
                   d.status, d.created_at::text AS created_at,
                   COUNT(a.id) AS answer_count
            FROM squad_doubts d
            LEFT JOIN squad_doubt_answers a ON a.doubt_id = d.id
            WHERE d.squad_id = %s
            GROUP BY d.id
            ORDER BY d.created_at DESC
            LIMIT 40
        """, (squad_id,))
        doubts = [dict(r) for r in cur.fetchall()]
        return {"doubts": doubts}
    finally:
        conn.close()


# Doubts per-day limits keyed by plan
DOUBT_DAILY_LIMITS = {
    "free":    2,
    "basic":   5,
    "pro":     15,
    "premium": 999999,
}


def _doubt_quota(cur, user_id: str):
    """Return (used_today, daily_limit) for this user's plan."""
    cur.execute("SELECT COALESCE(plan,'free') AS plan FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    plan = row["plan"] if row else "free"
    limit = DOUBT_DAILY_LIMITS.get(plan, 2)
    cur.execute("""
        SELECT COUNT(*) AS cnt FROM squad_doubts
        WHERE user_id = %s AND created_at >= CURRENT_DATE
    """, (user_id,))
    used = cur.fetchone()["cnt"]
    return used, limit, plan


@router.get("/squads/{squad_id}/doubts/quota")
async def get_doubt_quota(
    squad_id: int,
    current_user: str = Depends(get_current_user),
):
    """Return today's doubt usage and limit for the current user."""
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)
        used, limit, plan = _doubt_quota(cur, current_user)
        return {"used": used, "limit": limit, "remaining": max(0, limit - used), "plan": plan}
    finally:
        conn.close()


@router.post("/squads/{squad_id}/doubts", status_code=201)
async def post_doubt(
    squad_id: int,
    data: PostDoubt,
    current_user: str = Depends(get_current_user),
):
    question = data.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question required")
    if len(question) > 1000:
        raise HTTPException(status_code=400, detail="Question too long")

    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)

        # ── Daily doubt quota check ───────────────────────────
        used, limit, _ = _doubt_quota(cur, current_user)
        if used >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily doubt limit reached ({limit}/day). Upgrade your plan for more."
            )

        # Default subject to squad's focus subject if blank
        subject = data.subject.strip()
        if not subject:
            cur.execute("SELECT focus_subject FROM squads WHERE id = %s", (squad_id,))
            row = cur.fetchone()
            subject = row["focus_subject"] if row else ""

        cur.execute("""
            INSERT INTO squad_doubts (squad_id, user_id, display_name, question, subject)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (squad_id, current_user, data.display_name, question, subject))
        doubt_id = cur.fetchone()["id"]

        _sys_msg(cur, squad_id, current_user,
                 f"❓ {data.display_name} posted a doubt: {question[:60]}{'…' if len(question) > 60 else ''}")
        _bump_squad_streak(cur, squad_id)
        conn.commit()
        return {"id": doubt_id, "posted": True}
    finally:
        conn.close()


@router.get("/squads/{squad_id}/doubts/{doubt_id}/answers")
async def get_answers(
    squad_id: int,
    doubt_id: int,
    current_user: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)
        cur.execute("""
            SELECT a.id, a.user_id, a.display_name, a.answer, a.upvotes,
                   a.ai_verdict, a.ai_note,
                   a.created_at::text AS created_at,
                   EXISTS(
                       SELECT 1 FROM squad_doubt_upvotes u
                       WHERE u.answer_id = a.id AND u.user_id = %s
                   ) AS i_upvoted
            FROM squad_doubt_answers a
            WHERE a.doubt_id = %s AND a.squad_id = %s
            ORDER BY a.upvotes DESC, a.created_at ASC
        """, (current_user, doubt_id, squad_id))
        return {"answers": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


@router.post("/squads/{squad_id}/doubts/{doubt_id}/answers", status_code=201)
async def post_answer(
    squad_id: int,
    doubt_id: int,
    data: PostAnswer,
    current_user: str = Depends(get_current_user),
):
    answer = data.answer.strip()
    if not answer:
        raise HTTPException(status_code=400, detail="Answer required")

    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)

        cur.execute(
            "SELECT id FROM squad_doubts WHERE id = %s AND squad_id = %s",
            (doubt_id, squad_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Doubt not found")

        cur.execute("""
            INSERT INTO squad_doubt_answers (doubt_id, squad_id, user_id, display_name, answer)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (doubt_id, squad_id, current_user, data.display_name, answer))
        ans_id = cur.fetchone()["id"]

        # Mark doubt as answered
        cur.execute(
            "UPDATE squad_doubts SET status = 'answered' WHERE id = %s", (doubt_id,)
        )
        _bump_squad_streak(cur, squad_id)
        conn.commit()
        return {"id": ans_id, "posted": True}
    finally:
        conn.close()


@router.post("/squads/{squad_id}/doubts/{doubt_id}/answers/{answer_id}/upvote")
async def upvote_answer(
    squad_id: int,
    doubt_id: int,
    answer_id: int,
    current_user: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)

        # Check answer belongs to this squad
        cur.execute(
            "SELECT user_id FROM squad_doubt_answers WHERE id = %s AND squad_id = %s",
            (answer_id, squad_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Answer not found")

        answerer_id = row["user_id"]
        if answerer_id == current_user:
            raise HTTPException(status_code=400, detail="Cannot upvote your own answer")

        # Insert upvote (ignore duplicate)
        cur.execute("""
            INSERT INTO squad_doubt_upvotes (answer_id, user_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING
        """, (answer_id, current_user))

        if cur.rowcount == 0:
            return {"upvoted": False, "message": "Already upvoted"}

        # Increment upvote count
        cur.execute(
            "UPDATE squad_doubt_answers SET upvotes = upvotes + 1 WHERE id = %s RETURNING upvotes",
            (answer_id,),
        )
        new_count = cur.fetchone()["upvotes"]

        # Award XP to answerer for every upvote
        cur.execute(
            "UPDATE users SET xp = xp + %s WHERE id = %s",
            (ANSWER_HELP_XP, answerer_id),
        )
        conn.commit()
        return {"upvoted": True, "upvotes": new_count, "xp_awarded": ANSWER_HELP_XP}
    finally:
        conn.close()


class PatchVerdict(BaseModel):
    ai_verdict: str   # "correct" | "partial" | "incorrect"
    ai_note: str


@router.patch("/squads/{squad_id}/doubts/{doubt_id}/answers/{answer_id}/verdict")
async def patch_answer_verdict(
    squad_id: int,
    doubt_id: int,
    answer_id: int,
    data: PatchVerdict,
    current_user: str = Depends(get_current_user),
):
    """Store AI-generated verdict on an answer (idempotent, any squad member may update)."""
    if data.ai_verdict not in ("correct", "partial", "incorrect"):
        raise HTTPException(status_code=400, detail="ai_verdict must be correct|partial|incorrect")

    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)
        cur.execute(
            """UPDATE squad_doubt_answers
               SET ai_verdict = %s, ai_note = %s
               WHERE id = %s AND squad_id = %s AND doubt_id = %s""",
            (data.ai_verdict, data.ai_note[:300], answer_id, squad_id, doubt_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Answer not found")
        conn.commit()
        return {"stored": True}
    finally:
        conn.close()



# SQUAD STREAK + DAILY CONCEPT
# ═══════════════════════════════════════════════════════════════

@router.get("/squads/{squad_id}/streak")
async def get_squad_streak(squad_id: int, current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)
        cur.execute(
            "SELECT streak, last_active_date::text AS last_active_date FROM squads WHERE id = %s",
            (squad_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else {"streak": 0, "last_active_date": None}
    finally:
        conn.close()


@router.get("/squads/{squad_id}/daily")
async def get_daily_concept(squad_id: int, current_user: str = Depends(get_current_user)):
    """Return today's concept for the squad (deterministic by date + squad_id)."""
    import hashlib
    from datetime import date

    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)

        cur.execute("SELECT focus_subject FROM squads WHERE id = %s", (squad_id,))
        row = cur.fetchone()
        subject = row["focus_subject"] if row else "General"

        concepts = _CONCEPTS.get(subject, _DEFAULT_CONCEPTS)
        seed = hashlib.md5(f"{date.today().isoformat()}-{squad_id}".encode()).hexdigest()
        idx = int(seed, 16) % len(concepts)
        concept = concepts[idx]

        # Load today's explanations for this squad
        today_str = date.today().isoformat()
        cur.execute("""
            SELECT sc.id, sc.teacher_user_id AS user_id,
                   u.name AS display_name,
                   sc.explanation, sc.xp_awarded,
                   sc.ai_verdict, sc.ai_note,
                   sc.created_at::text AS created_at
            FROM squad_challenges sc
            JOIN users u ON u.id = sc.teacher_user_id
            WHERE sc.squad_id = %s AND sc.concept = %s
              AND sc.status = 'completed'
              AND DATE(sc.created_at) = %s
        """, (squad_id, concept, today_str))
        explanations = [dict(r) for r in cur.fetchall()]

        # Has current user already submitted today?
        my_entry = next((e for e in explanations if e["user_id"] == current_user), None)

        return {
            "subject": subject,
            "concept": concept,
            "date": today_str,
            "explanations": explanations,
            "my_explanation": my_entry,
        }
    finally:
        conn.close()


@router.post("/squads/{squad_id}/daily/explain")
async def submit_daily_explanation(
    squad_id: int,
    data: SubmitExplanation,
    current_user: str = Depends(get_current_user),
):
    """Submit today's daily concept explanation. Each user can submit once per day."""
    import hashlib
    from datetime import date

    explanation = data.explanation.strip()
    word_count = len(explanation.split())
    if not explanation or word_count < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Explanation too short ({word_count} words). Write at least 10 words.",
        )

    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)

        cur.execute("SELECT focus_subject FROM squads WHERE id = %s", (squad_id,))
        row = cur.fetchone()
        subject = row["focus_subject"] if row else "General"

        concepts = _CONCEPTS.get(subject, _DEFAULT_CONCEPTS)
        seed = hashlib.md5(f"{date.today().isoformat()}-{squad_id}".encode()).hexdigest()
        idx = int(seed, 16) % len(concepts)
        concept = concepts[idx]
        today_str = date.today().isoformat()

        # One entry per user per day
        cur.execute("""
            SELECT id FROM squad_challenges
            WHERE squad_id = %s AND teacher_user_id = %s
              AND concept = %s AND DATE(created_at) = %s AND status = 'completed'
        """, (squad_id, current_user, concept, today_str))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Already submitted today's explanation")

        # Determine XP (AI-reviewed or fallback)
        ALLOWED_XP = {5, 15, 30}
        DAILY_XP = data.xp_override if data.xp_override in ALLOWED_XP else 20

        ai_verdict = data.ai_verdict if data.ai_verdict in ("correct", "partial", "incorrect") else None
        ai_note    = (data.ai_note or "")[:400]

        cur.execute("""
            INSERT INTO squad_challenges (squad_id, teacher_user_id, subject, concept, status, explanation, xp_awarded, ai_verdict, ai_note)
            VALUES (%s, %s, %s, %s, 'completed', %s, %s, %s, %s) RETURNING id
        """, (squad_id, current_user, subject, concept, explanation, DAILY_XP, ai_verdict, ai_note))

        cur.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (DAILY_XP, current_user))

        name = _get_name(cur, current_user)
        verdict_label = {"correct": "✅", "partial": "⚠️", "incorrect": "✗"}.get(ai_verdict, "📅")
        _sys_msg(cur, squad_id, current_user,
                 f"{verdict_label} {name} explained '{concept}' — +{DAILY_XP} XP!")
        _bump_squad_streak(cur, squad_id)
        conn.commit()
        return {"submitted": True, "xp_awarded": DAILY_XP, "concept": concept}
    finally:
        conn.close()


# ═══════════════════════════════════════════════════════════════
# POMODORO SESSION BROADCAST
# ═══════════════════════════════════════════════════════════════

class StartSession(BaseModel):
    display_name: str = "Student"
    minutes: int = 25

@router.post("/squads/{squad_id}/session/start")
async def start_session(
    squad_id: int,
    data: StartSession,
    current_user: str = Depends(get_current_user),
):
    minutes = max(5, min(60, data.minutes))
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_member(cur, squad_id, current_user)
        _sys_msg(cur, squad_id, current_user,
                 f"⏱️ {data.display_name} started a {minutes}-min study session. Focus mode ON! 🎯")
        _bump_squad_streak(cur, squad_id)
        conn.commit()
        return {"started": True, "minutes": minutes}
    finally:
        conn.close()

