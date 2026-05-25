"""
Squads Service - Business logic for study squads.
"""
import random
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.db import db
from app.db.connection import get_db, row_to_dict

SQUAD_MAX_SIZE = 4
TEACHING_XP_REWARD = 50

# Concept banks for challenges
_CONCEPTS = {
    "Mathematics":  ["Quadratic Equations", "Trigonometry", "Polynomials", "Coordinate Geometry"],
    "Science":      ["Laws of Motion", "Electricity", "Chemical Reactions", "Life Processes"],
    "Physics":      ["Newton's Laws", "Optics", "Current Electricity", "Gravitation"],
    "Chemistry":    ["Acids & Bases", "Carbon Compounds", "Periodic Table"],
    "Biology":      ["Photosynthesis", "Human Digestive System", "DNA & Heredity"],
    "English":      ["Tense Forms", "Passive Voice", "Essay Structure"],
}
_DEFAULT_CONCEPTS = ["Key Concepts", "Core Principles", "Important Definitions"]


class SquadService:
    """Squad business logic."""
    
    @staticmethod
    def get_user_squad(user_id: str) -> Optional[Dict]:
        """Get user's current active squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT s.id, s.name, s.focus_subject, s.created_at::text AS created_at
                FROM squads s
                JOIN squad_members sm ON sm.squad_id = s.id
                WHERE sm.user_id = %s AND s.is_active = TRUE
                ORDER BY sm.joined_at DESC LIMIT 1
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return None
            
            squad = dict(row)
            sid = squad["id"]
            
            # Get members
            cur.execute("""
                SELECT sm.user_id, sm.role, sm.last_seen_at::text AS last_seen_at,
                       u.name, u.standard
                FROM squad_members sm
                JOIN users u ON u.id = sm.user_id
                WHERE sm.squad_id = %s
            """, (sid,))
            squad["members"] = [dict(r) for r in cur.fetchall()]
            
            # Message count
            cur.execute("SELECT COUNT(*) AS cnt FROM squad_messages WHERE squad_id = %s", (sid,))
            squad["message_count"] = cur.fetchone()["cnt"]
            
            return squad
        finally:
            conn.close()
    
    @staticmethod
    def require_member(squad_id: int, user_id: str):
        """Raise 403 if user is not a member of the squad."""
        if not db.squads.is_member(squad_id, user_id):
            raise HTTPException(status_code=403, detail="Not a member of this squad")
    
    @staticmethod
    def match_into_squad(user_id: str) -> Dict:
        """Match user into an existing or new squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Get user info
            cur.execute("SELECT name, standard, language FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            standard = user["standard"]
            medium = user["language"]
            name = user["name"]
            
            # Check if already in a squad
            existing = SquadService.get_user_squad(user_id)
            if existing:
                return existing
            
            # Find matching squad with space
            cur.execute("""
                SELECT id, name, focus_subject, member_count
                FROM (
                    SELECT s.id, s.name, s.focus_subject,
                           (SELECT COUNT(*) FROM squad_members WHERE squad_id = s.id) AS member_count
                    FROM squads s
                    WHERE s.standard = %s AND s.medium = %s AND s.is_active = TRUE
                ) AS sq
                WHERE member_count < %s
                ORDER BY member_count DESC
                LIMIT 1
            """, (standard, medium, SQUAD_MAX_SIZE))
            squad = cur.fetchone()
            
            if squad:
                # Join existing squad
                squad_id = squad["id"]
            else:
                # Create new squad
                cur.execute("""
                    INSERT INTO squads (name, focus_subject, standard, medium)
                    VALUES (%s, 'General', %s, %s)
                    RETURNING id
                """, (f"Study Squad {standard}", standard, medium))
                squad_id = cur.fetchone()["id"]
            
            # Add member
            cur.execute("""
                INSERT INTO squad_members (squad_id, user_id, role)
                VALUES (%s, %s, 'learner')
                ON CONFLICT DO NOTHING
            """, (squad_id, user_id))
            
            # System message
            cur.execute("""
                INSERT INTO squad_messages (squad_id, user_id, display_name, content, msg_type)
                VALUES (%s, %s, 'System', %s, 'system')
            """, (squad_id, user_id, f"{name} joined the squad!"))
            
            conn.commit()
            
            return SquadService.get_user_squad(user_id)
        finally:
            conn.close()
    
    @staticmethod
    def get_messages(squad_id: int, since_id: int = 0, limit: int = 50) -> List[Dict]:
        """Get messages from squad since a specific ID."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, user_id, display_name, content, msg_type,
                       created_at::text AS created_at
                FROM squad_messages
                WHERE squad_id = %s AND id > %s
                ORDER BY id ASC
                LIMIT %s
            """, (squad_id, since_id, limit))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def send_message(
        squad_id: int,
        user_id: str,
        content: str,
        display_name: str = "Student",
        msg_type: str = "chat"
    ) -> Dict:
        """Send a message to squad chat."""
        if not content.strip():
            raise HTTPException(status_code=400, detail="Message content required")
        if len(content) > 2000:
            raise HTTPException(status_code=400, detail="Message too long")
        
        return db.squads.add_message(squad_id, user_id, display_name, content, msg_type)
    
    @staticmethod
    def leave_squad(squad_id: int, user_id: str) -> Dict:
        """Leave a squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Get user name for system message
            cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            name = user["name"] if user else "Student"
            
            # Remove member
            cur.execute(
                "DELETE FROM squad_members WHERE squad_id = %s AND user_id = %s",
                (squad_id, user_id)
            )
            
            if cur.rowcount > 0:
                # System message
                cur.execute("""
                    INSERT INTO squad_messages (squad_id, user_id, display_name, content, msg_type)
                    VALUES (%s, %s, 'System', %s, 'system')
                """, (squad_id, user_id, f"{name} left the squad"))
                conn.commit()
            
            return {"left": True}
        finally:
            conn.close()

    # ── Challenges ─────────────────────────────────────────────

    @staticmethod
    def get_challenge(squad_id: int) -> dict:
        """Get current open challenge for squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, subject, concept, status, created_at::text AS created_at
                FROM squad_challenges
                WHERE squad_id = %s AND status = 'open'
                ORDER BY id DESC LIMIT 1
            """, (squad_id,))
            row = cur.fetchone()
            return {"challenge": dict(row) if row else None}
        finally:
            conn.close()

    @staticmethod
    def create_challenge(squad_id: int, user_id: str) -> dict:
        """Create a new challenge for the squad (picks random concept)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            # Get squad focus subject
            cur.execute("SELECT focus_subject FROM squads WHERE id = %s", (squad_id,))
            row = cur.fetchone()
            subject = row["focus_subject"] if row else "General"
            concepts = _CONCEPTS.get(subject, _DEFAULT_CONCEPTS)
            concept = random.choice(concepts)

            cur.execute("""
                INSERT INTO squad_challenges (squad_id, subject, concept, status)
                VALUES (%s, %s, %s, 'open')
                RETURNING id, subject, concept, status, created_at::text AS created_at
            """, (squad_id, subject, concept))
            conn.commit()
            return {"challenge": dict(cur.fetchone())}
        finally:
            conn.close()

    @staticmethod
    def submit_challenge(squad_id: int, challenge_id: int, user_id: str,
                         explanation: str, xp_override: int = None,
                         ai_verdict: str = "", ai_note: str = "") -> dict:
        """Submit explanation for a challenge."""
        conn = get_db()
        try:
            cur = conn.cursor()
            xp = xp_override if xp_override is not None else 15
            cur.execute("""
                INSERT INTO squad_challenge_submissions
                    (challenge_id, user_id, explanation, xp_awarded, ai_verdict, ai_note)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (challenge_id, user_id)
                DO UPDATE SET explanation = EXCLUDED.explanation,
                              xp_awarded = EXCLUDED.xp_awarded,
                              ai_verdict = EXCLUDED.ai_verdict,
                              ai_note = EXCLUDED.ai_note
                RETURNING id
            """, (challenge_id, user_id, explanation, xp, ai_verdict, ai_note))
            conn.commit()
            # Award XP
            cur.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (xp, user_id))
            conn.commit()
            return {"completed": True, "xp_awarded": xp}
        finally:
            conn.close()

    # ── Doubts Board ────────────────────────────────────────────

    DOUBT_DAILY_LIMITS = {"free": 2, "basic": 5, "pro": 15, "premium": 999}

    @staticmethod
    def get_doubt_quota(squad_id: int, user_id: str) -> dict:
        today = __import__("datetime").date.today().isoformat()
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT plan FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            plan = row["plan"] if row else "free"
            limit = SquadService.DOUBT_DAILY_LIMITS.get(plan, 2)
            cur.execute("""
                SELECT count FROM squad_doubt_daily_counts
                WHERE user_id = %s AND day = %s
            """, (user_id, today))
            cnt_row = cur.fetchone()
            used = cnt_row["count"] if cnt_row else 0
            return {"remaining": max(0, limit - used), "limit": limit, "used": used}
        finally:
            conn.close()

    @staticmethod
    def get_doubts(squad_id: int) -> dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, user_id, display_name, subject, question,
                       created_at::text AS created_at
                FROM squad_doubts
                WHERE squad_id = %s
                ORDER BY id DESC LIMIT 50
            """, (squad_id,))
            return {"doubts": [dict(r) for r in cur.fetchall()]}
        finally:
            conn.close()

    @staticmethod
    def post_doubt(squad_id: int, user_id: str, question: str,
                   display_name: str = "Student", subject: str = "") -> dict:
        today = __import__("datetime").date.today().isoformat()
        conn = get_db()
        try:
            cur = conn.cursor()
            # Rate limit check
            cur.execute("SELECT plan FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            plan = row["plan"] if row else "free"
            limit = SquadService.DOUBT_DAILY_LIMITS.get(plan, 2)
            cur.execute("""
                SELECT count FROM squad_doubt_daily_counts
                WHERE user_id = %s AND day = %s
            """, (user_id, today))
            cnt_row = cur.fetchone()
            used = cnt_row["count"] if cnt_row else 0
            if used >= limit:
                raise HTTPException(status_code=429, detail="Daily doubt limit reached")
            # Insert doubt
            cur.execute("""
                INSERT INTO squad_doubts (squad_id, user_id, display_name, subject, question)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, user_id, display_name, subject, question,
                          created_at::text AS created_at
            """, (squad_id, user_id, display_name, subject, question))
            doubt = dict(cur.fetchone())
            # Increment daily count
            cur.execute("""
                INSERT INTO squad_doubt_daily_counts (user_id, day, count)
                VALUES (%s, %s, 1)
                ON CONFLICT (user_id, day)
                DO UPDATE SET count = squad_doubt_daily_counts.count + 1
            """, (user_id, today))
            conn.commit()
            return doubt
        finally:
            conn.close()

    @staticmethod
    def get_doubt_answers(squad_id: int, doubt_id: int) -> dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, user_id, display_name, content, upvotes,
                       ai_verdict, ai_note, created_at::text AS created_at
                FROM squad_doubt_answers
                WHERE doubt_id = %s
                ORDER BY upvotes DESC, id ASC
            """, (doubt_id,))
            return {"answers": [dict(r) for r in cur.fetchall()]}
        finally:
            conn.close()

    @staticmethod
    def post_answer(squad_id: int, doubt_id: int, user_id: str,
                    content: str, display_name: str = "Student") -> dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO squad_doubt_answers (doubt_id, user_id, display_name, content)
                VALUES (%s, %s, %s, %s)
                RETURNING id, user_id, display_name, content, upvotes,
                          ai_verdict, ai_note, created_at::text AS created_at
            """, (doubt_id, user_id, display_name, content))
            answer = dict(cur.fetchone())
            conn.commit()
            return answer
        finally:
            conn.close()

    @staticmethod
    def upvote_answer(squad_id: int, doubt_id: int, answer_id: int, user_id: str) -> dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO squad_doubt_upvotes (answer_id, user_id)
                VALUES (%s, %s) ON CONFLICT DO NOTHING
            """, (answer_id, user_id))
            if cur.rowcount > 0:
                cur.execute("""
                    UPDATE squad_doubt_answers SET upvotes = upvotes + 1
                    WHERE id = %s
                """, (answer_id,))
                conn.commit()
            return {"upvoted": cur.rowcount > 0}
        finally:
            conn.close()

    @staticmethod
    def patch_verdict(squad_id: int, doubt_id: int, answer_id: int,
                      ai_verdict: str, ai_note: str) -> dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                UPDATE squad_doubt_answers
                SET ai_verdict = %s, ai_note = %s
                WHERE id = %s
                RETURNING id, ai_verdict, ai_note
            """, (ai_verdict, ai_note, answer_id))
            conn.commit()
            return dict(cur.fetchone()) if cur.rowcount else {"id": answer_id}
        finally:
            conn.close()

    # ── Streak ──────────────────────────────────────────────────

    @staticmethod
    def get_squad_streak(squad_id: int, user_id: str) -> dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT current_streak, last_active
                FROM squad_streaks
                WHERE squad_id = %s AND user_id = %s
            """, (squad_id, user_id))
            row = cur.fetchone()
            return {"streak": row["current_streak"] if row else 0,
                    "last_active": row["last_active"] if row else ""}
        finally:
            conn.close()

    # ── Daily Concept ───────────────────────────────────────────

    @staticmethod
    def get_daily_concept(squad_id: int) -> dict:
        today = __import__("datetime").date.today().isoformat()
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, subject, concept, day
                FROM squad_daily_concepts
                WHERE squad_id = %s AND day = %s
            """, (squad_id, today))
            row = cur.fetchone()
            if row:
                return {"concept": dict(row), "day": today}
            # Auto-generate today's concept
            cur.execute("SELECT focus_subject FROM squads WHERE id = %s", (squad_id,))
            sq = cur.fetchone()
            subject = sq["focus_subject"] if sq else "General"
            concepts = _CONCEPTS.get(subject, _DEFAULT_CONCEPTS)
            concept = random.choice(concepts)
            cur.execute("""
                INSERT INTO squad_daily_concepts (squad_id, subject, concept, day)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (squad_id, day) DO NOTHING
                RETURNING id, subject, concept, day
            """, (squad_id, subject, concept, today))
            conn.commit()
            row2 = cur.fetchone()
            if not row2:
                cur.execute("""
                    SELECT id, subject, concept, day FROM squad_daily_concepts
                    WHERE squad_id = %s AND day = %s
                """, (squad_id, today))
                row2 = cur.fetchone()
            return {"concept": dict(row2), "day": today}
        finally:
            conn.close()

    @staticmethod
    def submit_daily_explain(squad_id: int, user_id: str, explanation: str,
                              xp_override: int = None,
                              ai_verdict: str = "", ai_note: str = "") -> dict:
        today = __import__("datetime").date.today().isoformat()
        conn = get_db()
        try:
            cur = conn.cursor()
            xp = xp_override if xp_override is not None else 15
            cur.execute("""
                INSERT INTO squad_daily_submissions
                    (squad_id, day, user_id, explanation, xp_awarded, ai_verdict, ai_note)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (squad_id, day, user_id)
                DO UPDATE SET explanation = EXCLUDED.explanation,
                              xp_awarded = EXCLUDED.xp_awarded,
                              ai_verdict = EXCLUDED.ai_verdict,
                              ai_note = EXCLUDED.ai_note
                RETURNING id
            """, (squad_id, today, user_id, explanation, xp, ai_verdict, ai_note))
            conn.commit()
            # Award XP + update streak
            cur.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (xp, user_id))
            cur.execute("""
                INSERT INTO squad_streaks (squad_id, user_id, current_streak, last_active)
                VALUES (%s, %s, 1, %s)
                ON CONFLICT (squad_id, user_id)
                DO UPDATE SET
                    current_streak = CASE
                        WHEN squad_streaks.last_active = (CURRENT_DATE - 1)::text
                        THEN squad_streaks.current_streak + 1
                        WHEN squad_streaks.last_active = %s THEN squad_streaks.current_streak
                        ELSE 1
                    END,
                    last_active = %s
            """, (squad_id, user_id, today, today, today))
            conn.commit()
            return {"completed": True, "xp_awarded": xp}
        finally:
            conn.close()

    # ── Study Session ───────────────────────────────────────────

    @staticmethod
    def start_session(squad_id: int, user_id: str,
                      display_name: str = "Student", minutes: int = 25) -> dict:
        """Broadcast a session-start system message."""
        conn = get_db()
        try:
            cur = conn.cursor()
            msg = f"{display_name} started a {minutes}-minute study session! 📚"
            cur.execute("""
                INSERT INTO squad_messages (squad_id, user_id, display_name, content, msg_type)
                VALUES (%s, %s, 'System', %s, 'system')
                RETURNING id
            """, (squad_id, user_id, msg))
            conn.commit()
            return {"started": True, "minutes": minutes}
        finally:
            conn.close()

