"""
Muqabla Service - Business logic for battles.
"""
import json
import re
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.db import db
from app.db.connection import get_db, row_to_dict
from services.ai_service import call_ai

BATTLE_XP_WIN = 50
BATTLE_XP_LOSE = 15
BATTLE_XP_DRAW = 25
QUESTIONS_COUNT = 5


async def _generate_questions(subject: str, standard: str, difficulty: str) -> List[Dict]:
    """Generate quiz questions via AI."""
    system = (
        "You are an expert question generator for Indian school students. "
        "You ONLY output valid JSON, nothing else."
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
    # Fallback
    return [{
        "q": f"A sample {subject} question for {standard}",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": 0,
        "explanation": "This is a fallback question.",
    }]


def _calc_score(answers: List[int], questions: List[Dict]) -> int:
    """Count correct answers."""
    score = 0
    for i, ans in enumerate(answers):
        if i < len(questions) and ans == questions[i].get("correct"):
            score += 1
    return score


def _safe_questions(questions: List[Dict], hide_correct: bool) -> List[Dict]:
    """Strip correct/explanation if hiding."""
    if not hide_correct:
        return questions
    return [{"q": q["q"], "options": q["options"]} for q in questions]


class MuqablaService:
    """Muqabla battle business logic."""
    
    @staticmethod
    def _get_user_info(cur, user_id: str) -> Dict:
        cur.execute("SELECT name, standard, school FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            return {"name": "Student", "standard": "Class 10", "school": ""}
        return dict(row)
    
    @staticmethod
    def _fmt_battle(row: Dict, viewer_id: str, questions_visible: bool) -> Dict:
        qs = []
        try:
            qs = json.loads(row.get("questions_json") or "[]")
        except (json.JSONDecodeError, ValueError):
            pass
        
        hide = not questions_visible
        return {
            "id": row["id"],
            "challenger_id": row["challenger_id"],
            "challenger_name": row["challenger_name"],
            "challenger_school": row.get("challenger_school", ""),
            "opponent_id": row.get("opponent_id"),
            "opponent_name": row.get("opponent_name"),
            "opponent_school": row.get("opponent_school", ""),
            "subject": row["subject"],
            "standard": row["standard"],
            "difficulty": row["difficulty"],
            "status": row["status"],
            "challenger_score": row.get("challenger_score"),
            "opponent_score": row.get("opponent_score"),
            "winner_id": row.get("winner_id"),
            "xp_awarded": row.get("xp_awarded"),
            "created_at": str(row.get("created_at") or ""),
            "completed_at": str(row.get("completed_at") or ""),
            "question_count": len(qs),
            "questions": _safe_questions(qs, hide),
            "is_challenger": row["challenger_id"] == viewer_id,
        }
    
    @staticmethod
    async def create_challenge(user_id: str, subject: str, difficulty: str) -> Dict:
        """Create a new battle challenge."""
        if difficulty not in ("Easy", "Medium", "Hard"):
            raise HTTPException(status_code=400, detail="difficulty must be Easy, Medium, or Hard")
        if not subject.strip():
            raise HTTPException(status_code=400, detail="subject is required")
        
        conn = get_db()
        try:
            cur = conn.cursor()
            info = MuqablaService._get_user_info(cur, user_id)
            
            # Generate questions
            questions = await _generate_questions(subject.strip(), info["standard"], difficulty)
            questions_json = json.dumps(questions)
            
            cur.execute("""
                INSERT INTO muqabla_battles
                  (challenger_id, challenger_name, challenger_school,
                   subject, standard, difficulty, questions_json, status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,'open')
                RETURNING id
            """, (
                user_id, info["name"], info.get("school", ""),
                subject.strip(), info["standard"], difficulty, questions_json,
            ))
            battle_id = cur.fetchone()["id"]
            conn.commit()
            return {"id": battle_id, "question_count": len(questions)}
        finally:
            conn.close()
    
    @staticmethod
    def join_battle(battle_id: int, user_id: str) -> Dict:
        """Join an open battle."""
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
            if row["challenger_id"] == user_id:
                raise HTTPException(status_code=400, detail="Cannot join your own battle")
            
            info = MuqablaService._get_user_info(cur, user_id)
            cur.execute("""
                UPDATE muqabla_battles
                SET opponent_id = %s, opponent_name = %s, opponent_school = %s, status = 'active'
                WHERE id = %s
            """, (user_id, info["name"], info.get("school", ""), battle_id))
            conn.commit()
            
            questions = json.loads(row["questions_json"] or "[]")
            return {
                "id": battle_id,
                "subject": row["subject"],
                "difficulty": row["difficulty"],
                "questions": _safe_questions(questions, False),
            }
        finally:
            conn.close()
    
    @staticmethod
    def decline_battle(battle_id: int) -> Dict:
        """Decline an open battle."""
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
    
    @staticmethod
    def submit_answers(battle_id: int, user_id: str, answers: List[int], time_seconds: int) -> Dict:
        """Submit answers for a battle."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM muqabla_battles WHERE id = %s", (battle_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Battle not found")
            
            questions = json.loads(row["questions_json"] or "[]")
            if len(answers) != len(questions):
                raise HTTPException(
                    status_code=400,
                    detail=f"Expected {len(questions)} answers, got {len(answers)}"
                )
            
            score = _calc_score(answers, questions)
            ans_json = json.dumps(answers)
            is_challenger = row["challenger_id"] == user_id
            is_opponent = row["opponent_id"] == user_id
            
            if not is_challenger and not is_opponent:
                raise HTTPException(status_code=403, detail="You are not part of this battle")
            
            status = row["status"]
            
            if is_challenger:
                if status not in ("open", "active"):
                    raise HTTPException(status_code=400, detail="Challenger already answered")
                cur.execute("""
                    UPDATE muqabla_battles
                    SET challenger_score=%s, challenger_answers=%s, challenger_time=%s,
                        status = CASE WHEN opponent_id IS NOT NULL THEN 'challenger_done' ELSE 'open' END
                    WHERE id=%s
                """, (score, ans_json, time_seconds, battle_id))
                conn.commit()
                return {"score": score, "total": len(questions), "status": "waiting_for_opponent"}
            
            if is_opponent:
                if status not in ("active", "challenger_done"):
                    raise HTTPException(status_code=400, detail="Battle is not active")
                
                c_score = row["challenger_score"] or 0
                
                if score > c_score:
                    winner_id = user_id
                elif c_score > score:
                    winner_id = row["challenger_id"]
                else:
                    winner_id = "draw"
                
                if winner_id == "draw":
                    c_xp = BATTLE_XP_DRAW
                    o_xp = BATTLE_XP_DRAW
                elif winner_id == user_id:
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
                """, (score, ans_json, time_seconds, winner_id, c_xp + o_xp, battle_id))
                cur.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (c_xp, row["challenger_id"]))
                cur.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (o_xp, user_id))
                conn.commit()
                
                return {
                    "score": score,
                    "total": len(questions),
                    "challenger_score": c_score,
                    "winner_id": winner_id,
                    "xp_earned": o_xp,
                    "questions": questions,
                }
        finally:
            conn.close()
    
    @staticmethod
    def get_battle(battle_id: int, user_id: str) -> Dict:
        """Get battle details."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM muqabla_battles WHERE id = %s", (battle_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Battle not found")
            
            is_participant = row["challenger_id"] == user_id or row["opponent_id"] == user_id
            show_questions = row["status"] == "completed" or is_participant
            
            return MuqablaService._fmt_battle(dict(row), user_id, show_questions)
        finally:
            conn.close()
    
    @staticmethod
    def get_open_battles(user_id: str, limit: int = 20) -> List[Dict]:
        """Get open battles to join."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT standard FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            standard = user["standard"] if user else "Class 10"
            
            cur.execute("""
                SELECT * FROM muqabla_battles
                WHERE status = 'open' AND standard = %s AND challenger_id != %s
                ORDER BY created_at DESC LIMIT %s
            """, (standard, user_id, limit))
            
            return [MuqablaService._fmt_battle(dict(r), user_id, False) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def get_my_history(user_id: str, limit: int = 50) -> List[Dict]:
        """Get completed battles for user."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT * FROM muqabla_battles
                WHERE status = 'completed' AND (challenger_id = %s OR opponent_id = %s)
                ORDER BY completed_at DESC LIMIT %s
            """, (user_id, user_id, limit))
            
            return [MuqablaService._fmt_battle(dict(r), user_id, True) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def get_leaderboard(limit: int = 50) -> List[Dict]:
        """Get weekly leaderboard."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT u.id, u.name, u.school, u.standard, u.xp,
                    (SELECT COUNT(*) FROM muqabla_battles 
                     WHERE winner_id = u.id AND completed_at > NOW() - INTERVAL '7 days') AS wins
                FROM users u
                ORDER BY xp DESC
                LIMIT %s
            """, (limit,))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
