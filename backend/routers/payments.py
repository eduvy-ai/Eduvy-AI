"""
payments.py — Razorpay payment gateway integration.

POST /api/payments/create-order  → create Razorpay order for a plan upgrade
POST /api/payments/verify        → verify payment signature & upgrade the user's plan
GET  /api/payments/plans         → return plan prices (public, no auth)
"""
import os
import hmac
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx

from database import get_db, row_to_dict
from routers.auth import get_current_user

router = APIRouter()

# ── Plan catalogue ────────────────────────────────────────────
# Prices in paise (₹1 = 100 paise)
PLAN_PRICES = {
    "basic":   {"amount": 9900,  "label": "Basic",   "duration_days": 30},
    "pro":     {"amount": 24900, "label": "Pro",      "duration_days": 30},
    "premium": {"amount": 49900, "label": "Premium",  "duration_days": 30},
}

_RZP_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
_RZP_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
_RZP_API        = "https://api.razorpay.com/v1"


def _rzp_auth() -> tuple[str, str]:
    if not _RZP_KEY_ID or not _RZP_KEY_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Payment gateway not configured. Please contact support.",
        )
    return (_RZP_KEY_ID, _RZP_KEY_SECRET)


# ── Public: plan prices ───────────────────────────────────────
@router.get("/payments/plans")
async def get_plan_prices():
    return {
        plan: {
            "amount_paise": info["amount"],
            "amount_rupees": info["amount"] // 100,
            "label": info["label"],
            "duration_days": info["duration_days"],
        }
        for plan, info in PLAN_PRICES.items()
    }


# ── Create Razorpay order ─────────────────────────────────────
class CreateOrderRequest(BaseModel):
    plan: str


@router.post("/payments/create-order")
async def create_order(data: CreateOrderRequest, user_id: str = Depends(get_current_user)):
    plan = data.plan.lower()
    if plan not in PLAN_PRICES:
        raise HTTPException(status_code=422, detail=f"Invalid plan. Choose from: {', '.join(PLAN_PRICES)}")

    key_id, key_secret = _rzp_auth()
    plan_info = PLAN_PRICES[plan]

    # Validate user exists
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, email, name FROM users WHERE id = %s", (user_id,))
        user_row = cur.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")
        user = row_to_dict(user_row)
    finally:
        conn.close()

    receipt_id = f"vidyai_{plan}_{uuid.uuid4().hex[:8]}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{_RZP_API}/orders",
                auth=(key_id, key_secret),
                json={
                    "amount":   plan_info["amount"],
                    "currency": "INR",
                    "receipt":  receipt_id,
                    "notes": {
                        "user_id": user_id,
                        "plan":    plan,
                    },
                },
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Payment gateway error. Please try again.")
        order = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Payment gateway timed out. Please try again.")

    return {
        "order_id":    order["id"],
        "amount":      plan_info["amount"],
        "currency":    "INR",
        "key_id":      key_id,         # safe to expose — public key
        "plan":        plan,
        "plan_label":  plan_info["label"],
        "user_name":   user.get("name", ""),
        "user_email":  user.get("email", ""),
    }


# ── Verify payment & upgrade plan ────────────────────────────
class VerifyPaymentRequest(BaseModel):
    order_id:   str
    payment_id: str
    signature:  str
    plan:       str


@router.post("/payments/verify")
async def verify_payment(data: VerifyPaymentRequest, user_id: str = Depends(get_current_user)):
    plan = data.plan.lower()
    if plan not in PLAN_PRICES:
        raise HTTPException(status_code=422, detail="Invalid plan")

    _, key_secret = _rzp_auth()

    # Verify Razorpay HMAC-SHA256 signature
    expected = hmac.new(
        key_secret.encode(),
        f"{data.order_id}|{data.payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, data.signature):
        raise HTTPException(status_code=400, detail="Payment verification failed — invalid signature")

    # Upgrade the user's plan
    duration = PLAN_PRICES[plan]["duration_days"]
    expires_at = (datetime.now(timezone.utc) + timedelta(days=duration)).strftime("%Y-%m-%d")

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET plan = %s, plan_expires_at = %s WHERE id = %s",
            (plan, expires_at, user_id),
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "success":     True,
        "plan":        plan,
        "expires_at":  expires_at,
        "message":     f"Plan upgraded to {PLAN_PRICES[plan]['label']} successfully!",
    }
