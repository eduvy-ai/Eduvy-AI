"""
bhool.py — Bhool Bazaar: Mistake Marketplace endpoints.

POST   /api/bhool/cards                        → save a mistake card (private)
GET    /api/bhool/cards/mine                   → get all my cards
PUT    /api/bhool/cards/{id}                   → update/publish a card
DELETE /api/bhool/cards/{id}                   → delete my card

GET    /api/bhool/marketplace                  → feed of published cards (with filters)
GET    /api/bhool/marketplace/top              → weekly leaderboard by subject
POST   /api/bhool/cards/{id}/collect           → collect (bookmark) a card
POST   /api/bhool/cards/{id}/react             → react with emoji
GET    /api/bhool/cards/{id}                   → get single card detail
GET    /api/bhool/collections                  → my collected cards
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional

from database import get_db
from routers.auth import get_current_user

router = APIRouter()

BHOOL_COINS_PER_PUBLISH   = 5
BHOOL_COINS_PER_COLLECT   = 3   # earned by author when someone collects their card
BHOOL_XP_PER_COLLECT      = 10  # XP earned by person who collects
VALID_REACTIONS           = {"same", "clever", "tricky", "lol"}


# ── Request models ────────────────────────────────────────────

class BhoolCardCreate(BaseModel):
    subject:        str
    standard:       str = "Class 10"
    question:       str
    wrong_answer:   str
    correct_answer: str
    why_wrong:      str = ""
    is_published:   bool = False


class BhoolCardUpdate(BaseModel):
    subject:        Optional[str] = None
    question:       Optional[str] = None
    wrong_answer:   Optional[str] = None
    correct_answer: Optional[str] = None
    why_wrong:      Optional[str] = None
    is_published:   Optional[bool] = None


class ReactRequest(BaseModel):
    emoji: str = "same"     # same | clever | tricky | lol


# ── Helpers ───────────────────────────────────────────────────

def _require_card_owner(cur, card_id: int, user_id: str) -> dict:
    cur.execute("SELECT * FROM bhool_cards WHERE id = %s AND user_id = %s", (card_id, user_id))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Card not found or access denied")
    return dict(row)


def _card_public(row: dict) -> dict:
    """Strip internal fields for public view."""
    return {
        "id":             row["id"],
        "subject":        row["subject"],
        "standard":       row["standard"],
        "question":       row["question"],
        "wrong_answer":   row["wrong_answer"],
        "correct_answer": row["correct_answer"],
        "why_wrong":      row["why_wrong"],
        "bhool_coins":    row["bhool_coins"],
        "created_at":     str(row.get("created_at") or ""),
        "author_name":    row.get("author_name", "Student"),
        "author_standard": row.get("author_standard", ""),
        "collect_count":  row.get("collect_count", 0),
        "reaction_counts": row.get("reaction_counts", {}),
        "my_reaction":    row.get("my_reaction"),
        "is_collected":   row.get("is_collected", False),
    }


# ── My cards ──────────────────────────────────────────────────

@router.post("/bhool/cards", status_code=201)
async def create_card(data: BhoolCardCreate, current_user: str = Depends(get_current_user)):
    if not data.question.strip() or not data.wrong_answer.strip() or not data.correct_answer.strip():
        raise HTTPException(status_code=400, detail="question, wrong_answer and correct_answer are required")
    if len(data.question) > 1000 or len(data.correct_answer) > 1000:
        raise HTTPException(status_code=400, detail="Field too long (max 1000 chars)")

    coins = BHOOL_COINS_PER_PUBLISH if data.is_published else 0
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO bhool_cards
              (user_id, subject, standard, question, wrong_answer, correct_answer, why_wrong, is_published, bhool_coins)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
        """, (
            current_user, data.subject, data.standard,
            data.question.strip(), data.wrong_answer.strip(),
            data.correct_answer.strip(), data.why_wrong.strip(),
            data.is_published, coins,
        ))
        card_id = cur.fetchone()["id"]
        conn.commit()
        return {"id": card_id, "bhool_coins": coins}
    finally:
        conn.close()


@router.get("/bhool/cards/mine")
async def get_my_cards(current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT bc.*,
                   (SELECT COUNT(*) FROM bhool_collections WHERE card_id = bc.id) AS collect_count
            FROM bhool_cards bc
            WHERE bc.user_id = %s
            ORDER BY bc.created_at DESC
        """, (current_user,))
        cards = [dict(r) for r in cur.fetchall()]
        return {"cards": cards}
    finally:
        conn.close()


@router.put("/bhool/cards/{card_id}")
async def update_card(
    card_id: int,
    data: BhoolCardUpdate,
    current_user: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor()
        card = _require_card_owner(cur, card_id, current_user)

        updates = {k: v for k, v in data.dict().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Award coins when first publishing
        if updates.get("is_published") and not card["is_published"]:
            updates["bhool_coins"] = card["bhool_coins"] + BHOOL_COINS_PER_PUBLISH

        set_clause = ", ".join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [card_id, current_user]
        cur.execute(
            f"UPDATE bhool_cards SET {set_clause} WHERE id = %s AND user_id = %s",
            values,
        )
        conn.commit()
        cur.execute("SELECT * FROM bhool_cards WHERE id = %s", (card_id,))
        return dict(cur.fetchone())
    finally:
        conn.close()


@router.delete("/bhool/cards/{card_id}")
async def delete_card(card_id: int, current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        _require_card_owner(cur, card_id, current_user)
        cur.execute("DELETE FROM bhool_cards WHERE id = %s AND user_id = %s", (card_id, current_user))
        conn.commit()
        return {"deleted": True}
    finally:
        conn.close()


# ── Marketplace feed ─────────────────────────────────────────

@router.get("/bhool/marketplace")
async def get_marketplace(
    subject:  Optional[str] = Query(None),
    standard: Optional[str] = Query(None),
    sort:     str           = Query("recent"),  # recent | coins | collected
    offset:   int           = Query(0, ge=0),
    limit:    int           = Query(20, ge=1, le=50),
    current_user: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        cur = conn.cursor()

        # Build filter
        filters = ["bc.is_published = TRUE", "bc.user_id != %s"]
        params  = [current_user]
        if subject:
            filters.append("bc.subject = %s"); params.append(subject)
        if standard:
            filters.append("bc.standard = %s"); params.append(standard)

        order = {
            "coins":     "bc.bhool_coins DESC",
            "collected": "collect_count DESC",
        }.get(sort, "bc.created_at DESC")

        params += [limit, offset]
        cur.execute(f"""
            SELECT bc.*,
                   u.name  AS author_name,
                   u.standard AS author_standard,
                   (SELECT COUNT(*) FROM bhool_collections col WHERE col.card_id = bc.id) AS collect_count,
                   (SELECT emoji FROM bhool_reactions  WHERE card_id = bc.id AND user_id = %s LIMIT 1) AS my_reaction,
                   EXISTS(SELECT 1 FROM bhool_collections WHERE card_id = bc.id AND user_id = %s) AS is_collected
            FROM bhool_cards bc
            JOIN users u ON u.id = bc.user_id
            WHERE {' AND '.join(filters)}
            ORDER BY {order}
            LIMIT %s OFFSET %s
        """, [current_user, current_user] + params[1:])

        cards = [_card_public(dict(r)) for r in cur.fetchall()]

        # Reaction counts per card
        for card in cards:
            cur.execute("""
                SELECT emoji, COUNT(*) AS cnt
                FROM bhool_reactions WHERE card_id = %s GROUP BY emoji
            """, (card["id"],))
            card["reaction_counts"] = {r["emoji"]: r["cnt"] for r in cur.fetchall()}

        return {"cards": cards, "offset": offset, "limit": limit}
    finally:
        conn.close()


@router.get("/bhool/marketplace/top")
async def get_top_cards(
    subject: Optional[str] = Query(None),
    current_user: str = Depends(get_current_user),
):
    """Weekly top mistake cards — most collected, per subject."""
    conn = get_db()
    try:
        cur = conn.cursor()
        filters = ["bc.is_published = TRUE", "bc.created_at >= NOW() - INTERVAL '7 days'"]
        params  = []
        if subject:
            filters.append("bc.subject = %s"); params.append(subject)

        cur.execute(f"""
            SELECT bc.subject,
                   bc.id, bc.question, bc.wrong_answer, bc.correct_answer,
                   bc.why_wrong, bc.bhool_coins,
                   bc.created_at::text AS created_at,
                   u.name AS author_name, u.standard AS author_standard,
                   COUNT(col.id) AS collect_count
            FROM bhool_cards bc
            JOIN users u ON u.id = bc.user_id
            LEFT JOIN bhool_collections col ON col.card_id = bc.id
            WHERE {' AND '.join(filters)}
            GROUP BY bc.id, u.name, u.standard
            ORDER BY collect_count DESC
            LIMIT 15
        """, params)
        return {"top": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


@router.get("/bhool/cards/{card_id}")
async def get_card(card_id: int, current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT bc.*,
                   u.name AS author_name, u.standard AS author_standard,
                   (SELECT COUNT(*) FROM bhool_collections WHERE card_id = bc.id) AS collect_count,
                   EXISTS(SELECT 1 FROM bhool_collections WHERE card_id = bc.id AND user_id = %s) AS is_collected,
                   (SELECT emoji FROM bhool_reactions WHERE card_id = bc.id AND user_id = %s LIMIT 1) AS my_reaction
            FROM bhool_cards bc
            JOIN users u ON u.id = bc.user_id
            WHERE bc.id = %s AND (bc.is_published = TRUE OR bc.user_id = %s)
        """, (current_user, current_user, card_id, current_user))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Card not found")
        card = _card_public(dict(row))
        cur.execute("""
            SELECT emoji, COUNT(*) AS cnt FROM bhool_reactions WHERE card_id = %s GROUP BY emoji
        """, (card_id,))
        card["reaction_counts"] = {r["emoji"]: r["cnt"] for r in cur.fetchall()}
        return card
    finally:
        conn.close()


# ── Collect ───────────────────────────────────────────────────

@router.post("/bhool/cards/{card_id}/collect")
async def collect_card(card_id: int, current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        # Card must be published and not own card
        cur.execute("SELECT user_id FROM bhool_cards WHERE id = %s AND is_published = TRUE", (card_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Card not found")
        if row["user_id"] == current_user:
            raise HTTPException(status_code=400, detail="Cannot collect your own card")

        # Upsert collection
        cur.execute("""
            INSERT INTO bhool_collections (user_id, card_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING
        """, (current_user, card_id))

        if cur.rowcount > 0:
            # Award coins to card author
            cur.execute(
                "UPDATE bhool_cards SET bhool_coins = bhool_coins + %s WHERE id = %s",
                (BHOOL_COINS_PER_COLLECT, card_id),
            )
            # Award XP to collector
            cur.execute(
                "UPDATE users SET xp = xp + %s WHERE id = %s",
                (BHOOL_XP_PER_COLLECT, current_user),
            )
            conn.commit()
            return {"collected": True, "xp_earned": BHOOL_XP_PER_COLLECT}
        conn.commit()
        return {"collected": False, "message": "Already collected"}
    finally:
        conn.close()


# ── React ─────────────────────────────────────────────────────

@router.post("/bhool/cards/{card_id}/react")
async def react_card(
    card_id: int,
    data: ReactRequest,
    current_user: str = Depends(get_current_user),
):
    if data.emoji not in VALID_REACTIONS:
        raise HTTPException(status_code=400, detail=f"emoji must be one of {VALID_REACTIONS}")

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM bhool_cards WHERE id = %s AND is_published = TRUE", (card_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Card not found")

        cur.execute("""
            INSERT INTO bhool_reactions (user_id, card_id, emoji)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, card_id)
            DO UPDATE SET emoji = EXCLUDED.emoji
        """, (current_user, card_id, data.emoji))
        conn.commit()
        return {"reacted": True, "emoji": data.emoji}
    finally:
        conn.close()


# ── My Collections ────────────────────────────────────────────

@router.get("/bhool/collections")
async def get_my_collections(current_user: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT bc.*,
                   u.name AS author_name, u.standard AS author_standard,
                   col.collected_at::text AS collected_at
            FROM bhool_collections col
            JOIN bhool_cards bc ON bc.id = col.card_id
            JOIN users u ON u.id = bc.user_id
            WHERE col.user_id = %s
            ORDER BY col.collected_at DESC
        """, (current_user,))
        return {"cards": [_card_public(dict(r)) for r in cur.fetchall()]}
    finally:
        conn.close()
