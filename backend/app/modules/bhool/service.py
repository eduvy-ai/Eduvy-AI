"""
Bhool Service - Business logic for Bhool Bazaar.
"""
import uuid
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.db import db
from app.db.connection import get_db, row_to_dict

BHOOL_COINS_PER_PUBLISH = 5
BHOOL_COINS_PER_COLLECT = 3
BHOOL_XP_PER_COLLECT = 10
VALID_REACTIONS = {"same", "clever", "tricky", "lol"}


class BhoolService:
    """Bhool Bazaar business logic."""
    
    @staticmethod
    def create_card(
        user_id: str,
        subject: str,
        question: str,
        wrong_answer: str,
        correct_answer: str,
        standard: str = "Class 10",
        why_wrong: str = "",
        is_published: bool = False
    ) -> Dict:
        """Create a new bhool card."""
        if not question.strip() or not wrong_answer.strip() or not correct_answer.strip():
            raise HTTPException(status_code=400, detail="question, wrong_answer and correct_answer required")
        if len(question) > 1000 or len(correct_answer) > 1000:
            raise HTTPException(status_code=400, detail="Field too long (max 1000 chars)")
        
        conn = get_db()
        try:
            cur = conn.cursor()
            
            coins = BHOOL_COINS_PER_PUBLISH if is_published else 0
            
            cur.execute("""
                INSERT INTO bhool_cards 
                (user_id, subject, standard, question,
                 wrong_answer, correct_answer, why_wrong, is_published, bhool_coins)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                user_id, subject, standard,
                question, wrong_answer, correct_answer, why_wrong, is_published, coins
            ))
            conn.commit()
            return row_to_dict(cur.fetchone())
        finally:
            conn.close()
    
    @staticmethod
    def get_my_cards(user_id: str) -> List[Dict]:
        """Get all cards created by user."""
        return db.bhool.get_user_cards(user_id)
    
    @staticmethod
    def update_card(user_id: str, card_id: str, **updates) -> Dict:
        """Update a bhool card (only owner can update)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Verify ownership
            cur.execute("SELECT * FROM bhool_cards WHERE id = %s AND user_id = %s", (card_id, user_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Card not found or access denied")
            
            # Filter None values
            updates = {k: v for k, v in updates.items() if v is not None}
            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            # Field names match DB now
            db_updates = updates
            
            set_clause = ", ".join(f"{k} = %s" for k in db_updates.keys())
            values = list(db_updates.values()) + [card_id]
            
            cur.execute(f"UPDATE bhool_cards SET {set_clause} WHERE id = %s RETURNING *", values)
            conn.commit()
            return row_to_dict(cur.fetchone())
        finally:
            conn.close()
    
    @staticmethod
    def delete_card(user_id: str, card_id: str) -> Dict:
        """Delete a bhool card (only owner can delete)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM bhool_cards WHERE id = %s AND user_id = %s", (card_id, user_id))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Card not found or access denied")
            conn.commit()
            return {"deleted": True}
        finally:
            conn.close()
    
    @staticmethod
    def get_marketplace(
        subject: str = None,
        standard: str = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """Get public cards for marketplace."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            query = "SELECT * FROM bhool_cards WHERE is_published = TRUE"
            params = []
            
            if subject:
                query += " AND subject = %s"
                params.append(subject)
            if standard:
                query += " AND standard = %s"
                params.append(standard)
            
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cur.execute(query, params)
            return [row_to_dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def collect_card(user_id: str, card_id: str) -> Dict:
        """Collect a card."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Check card exists and is published
            cur.execute("SELECT user_id FROM bhool_cards WHERE id = %s AND is_published = TRUE", (card_id,))
            card = cur.fetchone()
            if not card:
                raise HTTPException(status_code=404, detail="Card not found")
            
            # Can't collect own card
            if card["user_id"] == user_id:
                raise HTTPException(status_code=400, detail="Cannot collect your own card")
            
            # Check if already collected
            cur.execute(
                "SELECT 1 FROM bhool_collections WHERE user_id = %s AND card_id = %s",
                (user_id, card_id)
            )
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Already collected")
            
            # Add to collection
            cur.execute(
                "INSERT INTO bhool_collections (user_id, card_id) VALUES (%s, %s)",
                (user_id, card_id)
            )
            
            # Award bhool coins to card owner
            cur.execute(
                "UPDATE bhool_cards SET bhool_coins = bhool_coins + %s WHERE id = %s",
                (BHOOL_COINS_PER_COLLECT, card_id)
            )
            
            # Award XP to collector
            cur.execute(
                "UPDATE users SET xp = xp + %s WHERE id = %s",
                (BHOOL_XP_PER_COLLECT, user_id)
            )
            
            conn.commit()
            return {"collected": True, "xp_earned": BHOOL_XP_PER_COLLECT}
        finally:
            conn.close()
    
    @staticmethod
    def get_collected_cards(user_id: str) -> List[Dict]:
        """Get cards collected by user."""
        return db.bhool.get_collected_cards(user_id)

    @staticmethod
    def get_top_cards(subject: Optional[str] = None, limit: int = 20) -> List[Dict]:
        """Get top-collected cards."""
        conn = get_db()
        try:
            cur = conn.cursor()
            query = """
                SELECT c.id, c.user_id, c.subject, c.standard, c.question,
                       c.wrong_answer, c.correct_answer, c.why_wrong,
                       c.bhool_coins, c.created_at::text AS created_at,
                       COUNT(bc.card_id) AS collect_count
                FROM bhool_cards c
                LEFT JOIN bhool_collections bc ON bc.card_id = c.id
                WHERE c.is_published = TRUE
            """
            params: list = []
            if subject:
                query += " AND c.subject = %s"
                params.append(subject)
            query += " GROUP BY c.id ORDER BY collect_count DESC, c.created_at DESC LIMIT %s"
            params.append(limit)
            cur.execute(query, params)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def react_to_card(user_id: str, card_id: str, emoji: str) -> Dict:
        """Add or update a reaction on a bhool card."""
        if emoji not in VALID_REACTIONS:
            raise HTTPException(status_code=400, detail=f"Invalid emoji. Must be one of: {', '.join(VALID_REACTIONS)}")
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO bhool_reactions (card_id, user_id, emoji)
                VALUES (%s, %s, %s)
                ON CONFLICT (card_id, user_id)
                DO UPDATE SET emoji = EXCLUDED.emoji
            """, (card_id, user_id, emoji))
            conn.commit()
            # Return reaction counts for card
            cur.execute("""
                SELECT emoji, COUNT(*) AS count
                FROM bhool_reactions WHERE card_id = %s
                GROUP BY emoji
            """, (card_id,))
            reactions = {r["emoji"]: r["count"] for r in cur.fetchall()}
            return {"reacted": True, "emoji": emoji, "reactions": reactions}
        finally:
            conn.close()

