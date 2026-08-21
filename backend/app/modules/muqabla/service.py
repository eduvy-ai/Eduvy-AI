"""
Muqabla Service - Business logic for battles.
"""
import json
import re
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.db import db
from app.db.connection import get_db, row_to_dict
from app.modules.ai.prompts import get_service_prompt
from services.ai_service import call_ai

BATTLE_XP_WIN = 50
BATTLE_XP_LOSE = 15
BATTLE_XP_DRAW = 25
QUESTIONS_COUNT = 5


async def _generate_questions(subject: str, standard: str, difficulty: str) -> List[Dict]:
    """Generate quiz questions via AI."""
    system = get_service_prompt("muqabla_question_system")
    prompt = get_service_prompt(
        "muqabla_question_prompt",
        count=QUESTIONS_COUNT,
        subject=subject,
        standard=standard,
        difficulty=difficulty
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
        
        # Include viewer's answers when they have already answered
        viewer_answers = None
        status = row["status"]
        show_answers = status in ("completed", "waiting_for_opponent", "challenger_done", "opponent_done")
        if questions_visible and show_answers:
            answers_json = None
            if row["challenger_id"] == viewer_id:
                answers_json = row.get("challenger_answers")
            elif row.get("opponent_id") == viewer_id:
                answers_json = row.get("opponent_answers")
            
            if answers_json:
                try:
                    viewer_answers = json.loads(answers_json)
                except (json.JSONDecodeError, ValueError):
                    viewer_answers = None
        
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
            "my_answers": viewer_answers,
        }
    
    @staticmethod
    async def create_challenge(user_id: str, subject: str, difficulty: str, opponent_id: str = None) -> Dict:
        """Create a new battle challenge. If opponent_id is set, creates a direct challenge."""
        if difficulty not in ("Easy", "Medium", "Hard"):
            raise HTTPException(status_code=400, detail="difficulty must be Easy, Medium, or Hard")
        if not subject.strip():
            raise HTTPException(status_code=400, detail="subject is required")
        if opponent_id and opponent_id == user_id:
            raise HTTPException(status_code=400, detail="Cannot challenge yourself")
        
        conn = get_db()
        try:
            cur = conn.cursor()
            info = MuqablaService._get_user_info(cur, user_id)
            
            # Generate questions
            questions = await _generate_questions(subject.strip(), info["standard"], difficulty)
            questions_json = json.dumps(questions)
            
            # Look up opponent info for direct challenges
            opp_info = None
            if opponent_id:
                opp_info = MuqablaService._get_user_info(cur, opponent_id)
            
            cur.execute("""
                INSERT INTO muqabla_battles
                  (challenger_id, challenger_name, challenger_school,
                   subject, standard, difficulty, questions_json, status,
                   opponent_id, opponent_name, opponent_school)
                VALUES (%s,%s,%s,%s,%s,%s,%s,'open',%s,%s,%s)
                RETURNING id
            """, (
                user_id, info["name"], info.get("school", ""),
                subject.strip(), info["standard"], difficulty, questions_json,
                opponent_id if opp_info else None,
                opp_info.get("name") if opp_info else None,
                opp_info.get("school", "") if opp_info else None,
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
            
            # If challenger already answered, set status to challenger_done, else active
            new_status = 'challenger_done' if row.get("challenger_answers") is not None else 'active'
            
            cur.execute("""
                UPDATE muqabla_battles
                SET opponent_id = %s, opponent_name = %s, opponent_school = %s, status = %s
                WHERE id = %s
            """, (user_id, info["name"], info.get("school", ""), new_status, battle_id))
            conn.commit()
            
            questions = json.loads(row["questions_json"] or "[]")
            return {
                "id": battle_id,
                "subject": row["subject"],
                "standard": row["standard"],
                "difficulty": row["difficulty"],
                "questions": _safe_questions(questions, False),
                "question_count": len(questions),
                "status": new_status,
                "challenger_id": row["challenger_id"],
                "challenger_name": row["challenger_name"],
                "challenger_school": row.get("challenger_school", ""),
                "opponent_id": user_id,
                "opponent_name": info["name"],
                "opponent_school": info.get("school", ""),
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
                # Check if challenger already answered (not just status)
                if row.get("challenger_answers") is not None:
                    raise HTTPException(status_code=400, detail="You already submitted your answers")
                if status not in ("open", "active"):
                    raise HTTPException(status_code=400, detail="Battle is no longer accepting submissions")
                cur.execute("""
                    UPDATE muqabla_battles
                    SET challenger_score=%s, challenger_answers=%s, challenger_time=%s,
                        status = CASE WHEN opponent_id IS NOT NULL THEN 'challenger_done' ELSE 'open' END
                    WHERE id=%s AND challenger_answers IS NULL
                """, (score, ans_json, time_seconds, battle_id))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=400, detail="Submission failed - already answered")
                conn.commit()
                # Return questions with explanations so challenger can review
                return {
                    "score": score,
                    "total": len(questions),
                    "status": "waiting_for_opponent",
                    "questions": questions,
                    "answers": answers,
                }
            
            if is_opponent:
                # Check if opponent already answered
                if row.get("opponent_answers") is not None:
                    raise HTTPException(status_code=400, detail="You already submitted your answers")
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
                
                # Use atomic update with opponent_answers IS NULL check
                cur.execute("""
                    UPDATE muqabla_battles
                    SET opponent_score=%s, opponent_answers=%s, opponent_time=%s,
                        winner_id=%s, xp_awarded=%s, status='completed', completed_at=NOW()
                    WHERE id=%s AND opponent_answers IS NULL
                """, (score, ans_json, time_seconds, winner_id, c_xp + o_xp, battle_id))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=400, detail="Submission failed - already answered")
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
        """Get open battles to join (list view - no questions)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Auto-expire old open battles (older than 24 hours)
            cur.execute("""
                UPDATE muqabla_battles 
                SET status = 'expired' 
                WHERE status = 'open' AND created_at < NOW() - INTERVAL '24 hours'
            """)
            conn.commit()
            
            cur.execute("SELECT standard FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            standard = user["standard"] if user else "Class 10"
            
            cur.execute("""
                SELECT id, challenger_id, challenger_name, challenger_school,
                       subject, standard, difficulty, status,
                       created_at::text AS created_at, questions_json
                FROM muqabla_battles
                WHERE status = 'open' AND standard = %s AND challenger_id != %s
                      AND opponent_id IS NULL
                ORDER BY created_at DESC LIMIT %s
            """, (standard, user_id, limit))
            
            result = []
            for r in cur.fetchall():
                d = dict(r)
                # Count questions but don't include them (user must join first)
                try:
                    qs = json.loads(d.get('questions_json') or '[]')
                    d['question_count'] = len(qs) if qs else 5
                except:
                    d['question_count'] = 5
                d.pop('questions_json', None)
                d['questions'] = []  # Empty - must join to get questions
                d['is_challenger'] = False
                result.append(d)
            return result
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
                     WHERE winner_id = u.id AND completed_at > NOW() - INTERVAL '7 days') AS wins,
                    (SELECT COUNT(*) FROM muqabla_battles
                     WHERE (challenger_id = u.id OR opponent_id = u.id) AND status = 'completed'
                       AND completed_at > NOW() - INTERVAL '7 days') AS total_battles
                FROM users u
                WHERE u.id IN (
                    SELECT DISTINCT challenger_id FROM muqabla_battles WHERE completed_at > NOW() - INTERVAL '7 days'
                    UNION
                    SELECT DISTINCT opponent_id FROM muqabla_battles WHERE opponent_id IS NOT NULL AND completed_at > NOW() - INTERVAL '7 days'
                )
                ORDER BY wins DESC, u.xp DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
            result = []
            for i, r in enumerate(rows):
                d = dict(r)
                d["rank"] = i + 1
                result.append(d)
            return result
        finally:
            conn.close()

    @staticmethod
    def get_pending_battles(user_id: str) -> List[Dict]:
        """Get battles where I am challenged but haven't joined yet."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, challenger_id, challenger_name, challenger_school,
                       subject, standard, difficulty, status,
                       created_at::text AS created_at, expires_at::text AS expires_at
                FROM muqabla_battles
                WHERE opponent_id = %s AND status = 'open'
                ORDER BY created_at DESC LIMIT 20
            """, (user_id,))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def get_active_battles(user_id: str) -> List[Dict]:
        """Get battles that are in progress (joined, not yet completed)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            # Include 'open' for challenger's own battles, 'active'/'challenger_done' for all
            cur.execute("""
                SELECT id, challenger_id, challenger_name, opponent_id, opponent_name,
                       subject, difficulty, status, questions_json,
                       challenger_score,
                       created_at::text AS created_at
                FROM muqabla_battles
                WHERE (
                    (challenger_id = %s AND status IN ('open', 'active', 'challenger_done'))
                    OR (opponent_id = %s AND status IN ('active', 'challenger_done'))
                )
                ORDER BY created_at DESC LIMIT 20
            """, (user_id, user_id))
            result = []
            for r in cur.fetchall():
                d = dict(r)
                # Compute question_count from questions_json
                try:
                    qs = json.loads(d.get('questions_json') or '[]')
                    d['question_count'] = len(qs) if qs else 5
                except:
                    d['question_count'] = 5
                # Don't send full questions_json in list view
                d.pop('questions_json', None)
                result.append(d)
            return result
        finally:
            conn.close()

    @staticmethod
    def get_school_leaderboard(limit: int = 50) -> List[Dict]:
        """Get leaderboard grouped by school."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT school,
                       COUNT(*) AS member_count,
                       SUM(xp) AS total_xp,
                       (SELECT COUNT(*) FROM muqabla_battles mb
                        WHERE mb.winner_id IN (SELECT id FROM users u2 WHERE u2.school = u.school)
                          AND mb.completed_at > NOW() - INTERVAL '7 days') AS total_wins
                FROM users u
                WHERE school IS NOT NULL AND school <> ''
                GROUP BY school
                ORDER BY total_wins DESC, total_xp DESC
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
            result = []
            for i, r in enumerate(rows):
                d = dict(r)
                d["rank"] = i + 1
                result.append(d)
            return result
        finally:
            conn.close()

