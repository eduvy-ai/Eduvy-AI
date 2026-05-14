"""
muqabla.py — Muqabla Battles: Student vs Student + School Leaderboard

Battle flow (async):
  1. POST /muqabla/challenge        → create open battle (AI generates questions) status=open
  2. POST /muqabla/battles/{id}/join → opponent joins      status=active
  3. POST /muqabla/battles/{id}/answer → challenger or opponent submits answers
       - After challenger answers  → status=challenger_done
       - After both answer         → status=completed, winner calculated, XP awarded
  4. DELETE /muqabla/battles/{id}/decline → opponent declines open challenge

GET  /muqabla/open           → open challenges anyone can join (same standard)
GET  /muqabla/pending        → battles waiting for MY answer
GET  /muqabla/active         → my in-progress battles
GET  /muqabla/history        → my completed battles
GET  /muqabla/battles/{id}   → battle detail (questions hidden until it's your turn or done)
GET  /muqabla/students       → browse students to challenge
GET  /muqabla/leaderboard    → weekly student leaderboard
GET  /muqabla/school-leaderboard → weekly school leaderboard
"""
import json
import re
import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional

from database import get_db
from routers.auth import get_current_user
from services.ai_service import call_ai

router = APIRouter()

BATTLE_XP_WIN   = 50
BATTLE_XP_LOSE  = 15
BATTLE_XP_DRAW  = 25
QUESTIONS_COUNT = 5


# ── AI question generation ────────────────────────────────────

async def _generate_questions(subject: str, standard: str, difficulty: str) -> list:
    system = (
        "You are an expert question generator for Indian school students. "
        "You ONLY output valid JSON, nothing else — no markdown, no explanation."
    )
    prompt = (
        f"Generate {QUESTIONS_COUNT} multiple-choice questions for {subject}, "
        f"{standard} students, difficulty: {difficulty}.\n"
        "Return ONLY a JSON array:\n"
        '[{"q":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]\n'
        "'correct' is the 0-based index of the right option."
    )
    text, _, _ = await call_ai(
        provider="groq",
        model="llama-3.3-70b-versatile",
        prompt=prompt,
        system_prompt=system,
        history=[],
        max_tokens=2000,
    )
    # Safe JSON extraction
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            qs = json.loads(match.group())
            if isinstance(qs, list) and len(qs) > 0:
                return qs[:QUESTIONS_COUNT]
        except (json.JSONDecodeError, ValueError):
            pass
    # Fallback: 1 dummy question so battle doesn't break
    return [{
        "q": f"A sample {subject} question for {standard}",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": 0,
        "explanation": "This is a fallback question.",
    }]


def _calc_score(answers: list, questions: list) -> int:
    """Count correct answers."""
    score = 0
    for i, ans in enumerate(answers):
        if i < len(questions) and ans == questions[i].get("correct"):
            score += 1
    return score


def _safe_questions(questions: list, hide_correct: bool) -> list:
    """Strip correct/explanation if the answer phase isn't done yet."""
    if not hide_correct:
        return questions
    return [{"q": q["q"], "options": q["options"]} for q in questions]


# ── Request models ─────────────────────────────────────────────

class ChallengeCreate(BaseModel):
    subject:    str
    difficulty: str = "Medium"    # Easy | Medium | Hard


class AnswerSubmit(BaseModel):
    answers:      list[int]   # length must match question count
    time_seconds: int = 0


# ── Helper ────────────────────────────────────────────────────

def _get_user_info(cur, user_id: str) -> dict:
    cur.execute(
        "SELECT name, standard, school FROM users WHERE id = %s",
        (user_id,)
    )
    row = cur.fetchone()
    if not row:
        return {"name": "Student", "standard": "Class 10", "school": ""}
    return dict(row)


def _fmt_battle(row: dict, viewer_id: str, questions_visible: bool) -> dict:
    qs = []
    try:
        qs = json.loads(row.get("questions_json") or "[]")
    except (json.JSONDecodeError, ValueError):
        pass

    hide = not questions_visible
    return {
        "id":               row["id"],
        "challenger_id":    row["challenger_id"],
        "challenger_name":  row["challenger_name"],
        "challenger_school":row["challenger_school"],
        "opponent_id":      row["opponent_id"],
        "opponent_name":    row["opponent_name"],
        "opponent_school":  row["opponent_school"],
        "subject":          row["subject"],
        "standard":         row["standard"],
        "difficulty":       row["difficulty"],
        "status":           row["status"],
        "challenger_score": row["challenger_score"],
        "opponent_score":   row["opponent_score"],
        "winner_id":        row["winner_id"],
        "xp_awarded":       row["xp_awarded"],
        "created_at":       str(row.get("created_at") or ""),
        "expires_at":       str(row.get("expires_at") or ""),
        "completed_at":     str(row.get("completed_at") or ""),
        "question_count":   len(qs),
        "questions":        _safe_questions(qs, hide),
        "is_challenger":    row["challenger_id"] == viewer_id,
    }


# ── Create challenge ──────────────────────────────────────────

@router.post("/muqabla/challenge", status_code=201)
async def create_challenge(
    data: ChallengeCreate,
    current_user: str = Depends(get_current_user),
):
    if data.difficulty not in ("Easy", "Medium", "Hard"):
        raise HTTPException(status_code=400, detail="difficulty must be Easy, Medium, or Hard")
    if not data.subject.strip():
        raise HTTPException(status_code=400, detail="subject is required")

    conn = get_db()
    try:
        cur = conn.cursor()
        info = _get_user_info(cur, current_user)

        # Generate questions via AI (async, doesn't block DB connection much)
        questions = await _generate_questions(data.subject.strip(), info["standard"], data.difficulty)
        questions_json = json.dumps(questions)

        cur.execute("""
            INSERT INTO muqabla_battles
              (challenger_id, challenger_name, challenger_school,
               subject, standard, difficulty, questions_json, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'open')
            RETURNING id
        """, (
            current_user, info["name"], info["school"],
            data.subject.strip(), info["standard"], data.difficulty, questions_json,
        ))
        battle_id = cur.fetchone()["id"]
        conn.commit()
        return {"id": battle_id, "question_count": len(questions)}
    finally:
        conn.close()


# ── Join an open battle ───────────────────────────────────────

@router.post("/muqabla/battles/{battle_id}/join")
async def join_battle(battle_id: int, current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM muqabla_battles WHERE id = %s AND status = 'open'",
            (battle_id,)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Battle not found or no longer open")
        if row["challenger_id"] == current_user:
            raise HTTPException(status_code=400, detail="Cannot join your own battle")

        info = _get_user_info(cur, current_user)
        cur.execute("""
            UPDATE muqabla_battles
            SET opponent_id = %s, opponent_name = %s, opponent_school = %s, status = 'active'
            WHERE id = %s
        """, (current_user, info["name"], info["school"], battle_id))
        conn.commit()

        # Return full questions so opponent can answer immediately
        questions = json.loads(row["questions_json"] or "[]")
        return {
            "id": battle_id,
            "subject": row["subject"],
            "difficulty": row["difficulty"],
            "questions": _safe_questions(questions, False),
        }
    finally:
        conn.close()


# ── Decline ───────────────────────────────────────────────────

@router.delete("/muqabla/battles/{battle_id}/decline")
async def decline_battle(battle_id: int, current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE muqabla_battles SET status='declined' WHERE id=%s AND status='open'",
            (battle_id,)
        )
        conn.commit()
        return {"declined": True}
    finally:
        conn.close()


# ── Submit answers ────────────────────────────────────────────

@router.post("/muqabla/battles/{battle_id}/answer")
async def submit_answers(
    battle_id: int,
    data: AnswerSubmit,
    current_user: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM muqabla_battles WHERE id = %s", (battle_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Battle not found")

        questions = json.loads(row["questions_json"] or "[]")
        if len(data.answers) != len(questions):
            raise HTTPException(
                status_code=400,
                detail=f"Expected {len(questions)} answers, got {len(data.answers)}"
            )

        score    = _calc_score(data.answers, questions)
        ans_json = json.dumps(data.answers)
        is_challenger = row["challenger_id"] == current_user
        is_opponent   = row["opponent_id"]   == current_user

        if not is_challenger and not is_opponent:
            raise HTTPException(status_code=403, detail="You are not part of this battle")

        status = row["status"]

        # Challenger answers first (battle must be open or active)
        if is_challenger:
            if status not in ("open", "active"):
                raise HTTPException(status_code=400, detail="Challenger already answered")
            cur.execute("""
                UPDATE muqabla_battles
                SET challenger_score=%s, challenger_answers=%s, challenger_time=%s,
                    status = CASE WHEN opponent_id IS NOT NULL THEN 'challenger_done' ELSE 'open' END
                WHERE id=%s
            """, (score, ans_json, data.time_seconds, battle_id))
            conn.commit()
            return {"score": score, "total": len(questions), "status": "waiting_for_opponent"}

        # Opponent answers
        if is_opponent:
            if status not in ("active", "challenger_done"):
                raise HTTPException(status_code=400, detail="Battle is not active")

            c_score = row["challenger_score"] or 0
            # Calculate winner
            if score > c_score:
                winner_id = current_user
            elif c_score > score:
                winner_id = row["challenger_id"]
            else:
                winner_id = "draw"

            # Award XP
            if winner_id == "draw":
                c_xp = BATTLE_XP_DRAW
                o_xp = BATTLE_XP_DRAW
            elif winner_id == current_user:
                c_xp = BATTLE_XP_LOSE
                o_xp = BATTLE_XP_WIN
            else:
                c_xp = BATTLE_XP_WIN
                o_xp = BATTLE_XP_LOSE

            cur.execute("""
                UPDATE muqabla_battles
                SET opponent_score=%s, opponent_answers=%s, opponent_time=%s,
                    winner_id=%s, xp_awarded=%s, status='completed', completed_at=NOW()
                WHERE id=%s
            """, (score, ans_json, data.time_seconds, winner_id, c_xp + o_xp, battle_id))
            cur.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (c_xp, row["challenger_id"]))
            cur.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (o_xp, current_user))
            conn.commit()

            return {
                "score":        score,
                "total":        len(questions),
                "challenger_score": c_score,
                "winner_id":    winner_id,
                "xp_earned":    o_xp,
                "questions":    questions,  # reveal full answers after completion
            }
    finally:
        conn.close()


# ── Get battle detail ─────────────────────────────────────────

@router.get("/muqabla/battles/{battle_id}")
async def get_battle(battle_id: int, current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM muqabla_battles WHERE id = %s", (battle_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Battle not found")
        r = dict(row)

        # Questions visible when:
        # - It's an open battle and viewer is challenger (they created it → need to answer)
        # - Battle is active and viewer is the opponent (joined, ready to answer)
        # - Battle is completed (both answered, show results)
        is_chall = r["challenger_id"] == current_user
        is_opp   = r["opponent_id"]   == current_user
        status   = r["status"]
        visible  = (
            (status == "open" and is_chall) or
            (status in ("active", "challenger_done") and is_opp) or
            (status == "completed" and (is_chall or is_opp))
        )
        if not (is_chall or is_opp):
            raise HTTPException(status_code=403, detail="Access denied")
        return _fmt_battle(r, current_user, visible)
    finally:
        conn.close()


# ── List endpoints ────────────────────────────────────────────

@router.get("/muqabla/open")
async def list_open_battles(current_user: str = Depends(get_current_user)):
    """Open battles anyone can join (same standard as current user, not own)."""
    conn = get_db()
    try:
        cur = conn.cursor()
        info = _get_user_info(cur, current_user)
        cur.execute("""
            SELECT id, challenger_name, challenger_school, subject, difficulty, standard,
                   created_at::text AS created_at
            FROM muqabla_battles
            WHERE status = 'open'
              AND challenger_id != %s
              AND standard = %s
              AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 20
        """, (current_user, info["standard"]))
        return {"battles": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


@router.get("/muqabla/pending")
async def list_pending_for_me(current_user: str = Depends(get_current_user)):
    """Battles where I'm the opponent but haven't answered yet."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM muqabla_battles
            WHERE opponent_id = %s
              AND status IN ('active','challenger_done')
            ORDER BY created_at DESC
        """, (current_user,))
        rows = [dict(r) for r in cur.fetchall()]
        return {"battles": [_fmt_battle(r, current_user, True) for r in rows]}
    finally:
        conn.close()


@router.get("/muqabla/active")
async def list_active(current_user: str = Depends(get_current_user)):
    """My battles that are still in progress."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM muqabla_battles
            WHERE (challenger_id = %s OR opponent_id = %s)
              AND status IN ('open','active','challenger_done')
            ORDER BY created_at DESC
        """, (current_user, current_user))
        rows = [dict(r) for r in cur.fetchall()]
        return {"battles": [_fmt_battle(r, current_user, False) for r in rows]}
    finally:
        conn.close()


@router.get("/muqabla/history")
async def list_history(
    limit:  int = Query(20, ge=1, le=50),
    offset: int = Query(0,  ge=0),
    current_user: str = Depends(get_current_user),
):
    """My completed/expired/declined battles."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM muqabla_battles
            WHERE (challenger_id = %s OR opponent_id = %s)
              AND status IN ('completed','expired','declined')
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, (current_user, current_user, limit, offset))
        rows = [dict(r) for r in cur.fetchall()]
        return {"battles": [_fmt_battle(r, current_user, True) for r in rows]}
    finally:
        conn.close()


# ── Student search ────────────────────────────────────────────

@router.get("/muqabla/students")
async def search_students(
    q:        str = Query("",  max_length=50),
    standard: str = Query(""),
    current_user: str = Depends(get_current_user),
):
    """Browse students to challenge. Filter by name search or standard."""
    conn = get_db()
    try:
        cur = conn.cursor()
        if not standard:
            info = _get_user_info(cur, current_user)
            standard = info["standard"]

        name_filter = f"%{q}%" if q.strip() else "%"
        cur.execute("""
            SELECT id, name, standard, school,
                   (SELECT COUNT(*) FROM muqabla_battles
                    WHERE (challenger_id = u.id OR opponent_id = u.id)
                      AND status = 'completed') AS battles_played,
                   (SELECT COUNT(*) FROM muqabla_battles
                    WHERE winner_id = u.id) AS battles_won
            FROM users u
            WHERE u.id != %s
              AND u.standard = %s
              AND u.name ILIKE %s
            ORDER BY battles_won DESC
            LIMIT 20
        """, (current_user, standard, name_filter))
        return {"students": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


# ── Leaderboards ──────────────────────────────────────────────

@router.get("/muqabla/leaderboard")
async def student_leaderboard(current_user: str = Depends(get_current_user)):
    """Top students this week by battles won."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT u.id, u.name, u.standard, u.school, u.xp,
                   COUNT(DISTINCT mb.id) FILTER (WHERE mb.winner_id = u.id) AS wins,
                   COUNT(DISTINCT mb.id) FILTER (
                       WHERE (mb.challenger_id = u.id OR mb.opponent_id = u.id)
                         AND mb.status = 'completed'
                   ) AS total_battles
            FROM users u
            LEFT JOIN muqabla_battles mb ON (mb.challenger_id = u.id OR mb.opponent_id = u.id)
                AND mb.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY u.id
            HAVING COUNT(DISTINCT mb.id) FILTER (
                WHERE (mb.challenger_id = u.id OR mb.opponent_id = u.id)
                  AND mb.status = 'completed'
            ) > 0
            ORDER BY wins DESC, total_battles DESC, u.xp DESC
            LIMIT 20
        """)
        rows = [dict(r) for r in cur.fetchall()]
        for i, r in enumerate(rows):
            r["rank"] = i + 1
            r["is_me"] = r["id"] == current_user
        return {"leaderboard": rows}
    finally:
        conn.close()


@router.get("/muqabla/school-leaderboard")
async def school_leaderboard(current_user: str = Depends(get_current_user)):
    """Weekly school ranking — aggregate wins + XP by school name."""
    conn = get_db()
    try:
        cur = conn.cursor()
        # Get current user's school for highlighting
        cur.execute("SELECT school FROM users WHERE id = %s", (current_user,))
        user_row = cur.fetchone()
        my_school = (user_row or {}).get("school", "")

        cur.execute("""
            SELECT u.school,
                   COUNT(DISTINCT u.id)  AS member_count,
                   SUM(wins_sub.wins)    AS total_wins,
                   SUM(u.xp)            AS total_xp
            FROM users u
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS wins
                FROM muqabla_battles mb
                WHERE mb.winner_id = u.id
                  AND mb.created_at >= NOW() - INTERVAL '7 days'
            ) wins_sub ON TRUE
            WHERE u.school != ''
            GROUP BY u.school
            ORDER BY total_wins DESC, total_xp DESC
            LIMIT 20
        """)
        rows = [dict(r) for r in cur.fetchall()]
        for i, r in enumerate(rows):
            r["rank"]   = i + 1
            r["is_mine"] = bool(my_school) and r["school"] == my_school
        return {"schools": rows, "my_school": my_school}
    finally:
        conn.close()
