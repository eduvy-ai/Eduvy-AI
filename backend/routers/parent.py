"""
parent.py — Parent Dashboard PIN-sharing

Endpoints (authenticated — student):
  POST   /parent/pin            → generate / refresh a PIN (valid 90 days)
  GET    /parent/pin            → get my current PIN + URL
  DELETE /parent/pin            → revoke PIN

Public endpoint (no auth — parent visits link):
  GET    /parent/view/{pin}     → full read-only dashboard for the child
"""
import secrets
import string
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from routers.auth import get_current_user

router = APIRouter()

PIN_CHARS = string.ascii_uppercase + string.digits   # 36-char alphabet
PIN_LEN   = 8                                        # e.g. "X7KQ3RWM"


def _gen_pin() -> str:
    return "".join(secrets.choice(PIN_CHARS) for _ in range(PIN_LEN))


# ── Student: manage their PIN ─────────────────────────────────

@router.post("/parent/pin", status_code=201)
async def create_or_refresh_pin(current_user: str = Depends(get_current_user)):
    """Generate a new PIN (revokes old one if any)."""
    conn = get_db()
    try:
        cur = conn.cursor()
        # Delete any existing pin for this user
        cur.execute("DELETE FROM parent_pins WHERE user_id = %s", (current_user,))
        pin = _gen_pin()
        # Retry on the rare collision
        for _ in range(5):
            try:
                cur.execute("""
                    INSERT INTO parent_pins (user_id, pin)
                    VALUES (%s, %s)
                    RETURNING pin, expires_at
                """, (current_user, pin))
                row = cur.fetchone()
                conn.commit()
                return {"pin": row["pin"], "expires_at": str(row["expires_at"])}
            except Exception:
                pin = _gen_pin()
                conn.rollback()
        raise HTTPException(status_code=500, detail="Could not generate PIN, try again")
    finally:
        conn.close()


@router.get("/parent/pin")
async def get_my_pin(current_user: str = Depends(get_current_user)):
    """Return current PIN for the authenticated student (or null)."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT pin, expires_at, created_at
            FROM parent_pins
            WHERE user_id = %s AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1
        """, (current_user,))
        row = cur.fetchone()
        if not row:
            return {"pin": None, "expires_at": None}
        return {"pin": row["pin"], "expires_at": str(row["expires_at"])}
    finally:
        conn.close()


@router.delete("/parent/pin")
async def revoke_pin(current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM parent_pins WHERE user_id = %s", (current_user,))
        conn.commit()
        return {"revoked": True}
    finally:
        conn.close()


# ── Public: parent views child dashboard ─────────────────────

@router.get("/parent/view/{pin}")
async def parent_view(pin: str):
    """Public endpoint — no auth required. Returns aggregated child data."""
    if len(pin) != PIN_LEN or not all(c in PIN_CHARS for c in pin.upper()):
        raise HTTPException(status_code=404, detail="Invalid PIN")

    conn = get_db()
    try:
        cur = conn.cursor()
        # Lookup PIN
        cur.execute("""
            SELECT user_id FROM parent_pins
            WHERE pin = %s AND expires_at > NOW()
        """, (pin.upper(),))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="PIN not found or expired")

        uid = row["user_id"]

        # ── Profile ──
        cur.execute("""
            SELECT name, standard, board, language, school, plan, xp, streak, last_active
            FROM users WHERE id = %s
        """, (uid,))
        profile = dict(cur.fetchone() or {})
        if not profile:
            raise HTTPException(status_code=404, detail="Student not found")

        # ── Today's AI usage ──
        from datetime import date
        today = date.today().isoformat()
        cur.execute("""
            SELECT call_count, prompt_tokens, completion_tokens
            FROM ai_usage
            WHERE user_id = %s AND date = %s
        """, (uid, today))
        ai_today = dict(cur.fetchone() or {"call_count": 0, "prompt_tokens": 0, "completion_tokens": 0})

        # ── Monthly AI usage (current month) ──
        cur.execute("""
            SELECT COALESCE(SUM(call_count), 0) AS monthly_calls
            FROM ai_usage
            WHERE user_id = %s AND date >= date_trunc('month', CURRENT_DATE)::text
        """, (uid,))
        monthly = dict(cur.fetchone() or {"monthly_calls": 0})

        # ── Mastery ──
        cur.execute("""
            SELECT subject, score, updated_at
            FROM mastery WHERE user_id = %s ORDER BY score ASC
        """, (uid,))
        mastery = [dict(r) for r in cur.fetchall()]

        # ── Recent quiz results (last 10) ──
        cur.execute("""
            SELECT subject, difficulty, correct, total, created_at::text
            FROM quiz_results
            WHERE user_id = %s
            ORDER BY created_at DESC LIMIT 10
        """, (uid,))
        quizzes = [dict(r) for r in cur.fetchall()]

        # ── Bhool stats ──
        cur.execute("""
            SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE is_published) AS published,
                   COALESCE(SUM(bhool_coins), 0) AS coins
            FROM bhool_cards WHERE user_id = %s
        """, (uid,))
        bhool = dict(cur.fetchone() or {"total": 0, "published": 0, "coins": 0})

        cur.execute("""
            SELECT COUNT(*) AS collected
            FROM bhool_collections WHERE user_id = %s
        """, (uid,))
        bhool["collected"] = (cur.fetchone() or {"collected": 0})["collected"]

        # ── Muqabla stats ──
        cur.execute("""
            SELECT COUNT(*) FILTER (WHERE status = 'completed') AS battles_played,
                   COUNT(*) FILTER (WHERE winner_id = %s AND status = 'completed') AS battles_won
            FROM muqabla_battles
            WHERE challenger_id = %s OR opponent_id = %s
        """, (uid, uid, uid))
        muqabla = dict(cur.fetchone() or {"battles_played": 0, "battles_won": 0})

        # ── 7-day XP activity (quiz results per day) ──
        cur.execute("""
            SELECT date_trunc('day', created_at)::date::text AS day,
                   COUNT(*) AS quizzes,
                   COALESCE(SUM(correct), 0) AS correct
            FROM quiz_results
            WHERE user_id = %s AND created_at >= NOW() - INTERVAL '7 days'
            GROUP BY 1 ORDER BY 1
        """, (uid,))
        activity = [dict(r) for r in cur.fetchall()]

        return {
            "profile":    profile,
            "ai_today":   ai_today,
            "monthly_calls": int(monthly["monthly_calls"]),
            "mastery":    mastery,
            "quizzes":    quizzes,
            "bhool":      bhool,
            "muqabla":    muqabla,
            "activity":   activity,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
    finally:
        conn.close()
