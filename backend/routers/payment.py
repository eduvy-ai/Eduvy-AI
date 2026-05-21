import razorpay
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_db

router = APIRouter(prefix="/payment", tags=["payment"])

client = razorpay.Client(auth=(
    os.getenv("RAZORPAY_KEY_ID"),
    os.getenv("RAZORPAY_KEY_SECRET")
))

# ── Plan Prices (paise = ₹ × 100) ────────────────────────────
# Change prices here anytime — one place, everything updates.
PLAN_CONFIG = {
    "basic":   {"amount": 1000,  "label": "Basic",   "duration_days": 30},  # ₹1
    "pro":     {"amount": 2000,  "label": "Pro",     "duration_days": 30},  # ₹2
    "premium": {"amount": 3000,  "label": "Premium", "duration_days": 30},  # ₹3
}

# ── Request Models ────────────────────────────────────────────
class OrderRequest(BaseModel):
    user_id: str
    plan: str  # "basic" | "pro" | "premium"

class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: str
    plan: str


class FailureRequest(BaseModel):
    user_id: str
    plan: str
    razorpay_order_id: str
    razorpay_payment_id: str | None = None
    failure_reason: str | None = None
    failure_code: str | None = None

# ── GET /api/payment/plans ────────────────────────────────────
@router.get("/plans")
def get_plans():
    """Return plan prices to frontend."""
    return {
        plan: {
            "label":    cfg["label"],
            "amount":   cfg["amount"],
            "rupees":   cfg["amount"] / 100,
            "duration": cfg["duration_days"],
        }
        for plan, cfg in PLAN_CONFIG.items()
    }

# ── POST /api/payment/create-order ───────────────────────────
@router.post("/create-order")
def create_order(data: OrderRequest):
    if data.plan not in PLAN_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {data.plan}")
    
    cfg = PLAN_CONFIG[data.plan]
    try:
        order = client.order.create({
            "amount":   cfg["amount"],
            "currency": "INR",
            "receipt":  f"rcpt_{data.user_id[:20]}_{data.plan[:5]}",
            "notes": {
                "user_id": data.user_id,
                "plan":    data.plan,
            }
        })
        return {
            "order_id": order["id"],
            "amount":   cfg["amount"],
            "currency": "INR",
            "plan":     data.plan,
            "label":    cfg["label"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── POST /api/payment/verify ──────────────────────────────────
@router.post("/verify")
def verify_payment(data: VerifyRequest, db=Depends(get_db)):
    if data.plan not in PLAN_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {data.plan}")

    # 1. Verify Razorpay signature
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id":   data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature":  data.razorpay_signature,
        })
        payment = client.payment.fetch(data.razorpay_payment_id)
        payment_method = payment.get("method")
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    # 2. Calculate expiry
    duration_days = PLAN_CONFIG[data.plan]["duration_days"]
    expires_at    = (datetime.utcnow() + timedelta(days=duration_days)).strftime("%Y-%m-%d")

    # 3. Update user plan in Supabase
    try:
        cursor = db.cursor()
        cursor.execute(
            "UPDATE users SET plan = %s, plan_expires_at = %s WHERE id = %s",
            (data.plan, expires_at, data.user_id)
        )
        # 4. Save payment history
        cursor.execute(
            """INSERT INTO payment_history 
               (user_id, plan, amount, currency, razorpay_order_id, razorpay_payment_id, razorpay_signature, status, plan_expires_at, payment_method)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data.user_id,
                data.plan,
                PLAN_CONFIG[data.plan]["amount"],
                "INR",
                data.razorpay_order_id,
                data.razorpay_payment_id,
                data.razorpay_signature,
                "success",
                expires_at,
                payment_method,
            )
        )
        db.commit()
        cursor.close()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB update failed: {str(e)}")

    return {
        "success":    True,
        "plan":       data.plan,
        "expires_at": expires_at,
        "payment_id": data.razorpay_payment_id,
    }

@router.post("/record-failure")
def record_failure(data: FailureRequest, db=Depends(get_db)):
    """Called from frontend when payment fails or is dismissed."""
    try:
        cursor = db.cursor()
        cursor.execute(
            """INSERT INTO payment_history 
               (user_id, plan, amount, currency, razorpay_order_id, 
                razorpay_payment_id, razorpay_signature, status, 
                plan_expires_at, failure_reason, failure_code)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data.user_id,
                data.plan,
                PLAN_CONFIG[data.plan]["amount"],
                "INR",
                data.razorpay_order_id,
                data.razorpay_payment_id or "N/A",
                "N/A",
                "failed",
                "N/A",
                data.failure_reason or "Unknown",
                data.failure_code or "Unknown",
            )
        )
        db.commit()
        cursor.close()
        return {"recorded": True}
    except Exception as e:
        db.rollback()
        return {"recorded": False}