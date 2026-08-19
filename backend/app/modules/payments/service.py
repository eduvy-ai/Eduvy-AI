"""
Payments Service - Business logic for Razorpay integration.
"""
import os
import hmac
import hashlib
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict
from fastapi import HTTPException
import httpx

from app.db.connection import get_db, row_to_dict

logger = logging.getLogger(__name__)

PLAN_PRICES = {
    "basic": {"amount": 9900, "label": "Basic", "duration_days": 30},
    "pro": {"amount": 24900, "label": "Pro", "duration_days": 30},
    "premium": {"amount": 49900, "label": "Premium", "duration_days": 30},
}

# School B2B pricing
SCHOOL_PLAN_PRICES = {
    "school_basic": {
        "amount": 2500000,  # ₹25,000
        "label": "School Basic",
        "duration_days": 365,
        "student_limit": 200,
        "user_plan": "pro",  # Students get Pro features
    },
    "school_pro": {
        "amount": 5000000,  # ₹50,000
        "label": "School Pro",
        "duration_days": 365,
        "student_limit": 500,
        "user_plan": "premium",  # Students get Premium features
    },
}

_RZP_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
_RZP_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
_RZP_API = "https://api.razorpay.com/v1"


def _rzp_auth():
    if not _RZP_KEY_ID or not _RZP_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment gateway not configured")
    return (_RZP_KEY_ID, _RZP_KEY_SECRET)


class PaymentsService:
    """Payments business logic."""
    
    @staticmethod
    def get_plan_prices() -> Dict:
        """Get plan prices."""
        return {
            plan: {
                "amount_paise": info["amount"],
                "amount_rupees": info["amount"] // 100,
                "label": info["label"],
                "duration_days": info["duration_days"],
            }
            for plan, info in PLAN_PRICES.items()
        }
    
    @staticmethod
    async def create_order(user_id: str, plan: str) -> Dict:
        """Create Razorpay order."""
        plan = plan.lower()
        if plan not in PLAN_PRICES:
            raise HTTPException(status_code=422, detail=f"Invalid plan: {plan}")
        
        key_id, key_secret = _rzp_auth()
        plan_info = PLAN_PRICES[plan]
        
        # Validate user
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, email, name FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
        finally:
            conn.close()
        
        receipt_id = f"vidyai_{plan}_{uuid.uuid4().hex[:8]}"
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{_RZP_API}/orders",
                    auth=(key_id, key_secret),
                    json={
                        "amount": plan_info["amount"],
                        "currency": "INR",
                        "receipt": receipt_id,
                        "notes": {"user_id": user_id, "plan": plan},
                    }
                )
                if resp.status_code != 200:
                    raise HTTPException(status_code=502, detail="Failed to create order")
                order = resp.json()
        except httpx.RequestError as e:
            logger.error(f"Payment gateway error: {e}"); raise HTTPException(status_code=502, detail="Payment service temporarily unavailable. Please try again.")
        
        return {
            "order_id": order["id"],
            "amount": plan_info["amount"],
            "currency": "INR",
            "key_id": key_id,
            "plan": plan,
        }
    
    @staticmethod
    def verify_payment(user_id: str, order_id: str, payment_id: str, signature: str) -> Dict:
        """Verify payment and upgrade user plan."""
        key_id, key_secret = _rzp_auth()
        
        # Verify signature
        message = f"{order_id}|{payment_id}"
        expected_sig = hmac.new(
            key_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if signature != expected_sig:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Fetch order from Razorpay to get plan from notes
        plan = "basic"  # Default fallback
        try:
            import httpx
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    f"{_RZP_API}/orders/{order_id}",
                    auth=(key_id, key_secret)
                )
                if resp.status_code == 200:
                    order_data = resp.json()
                    plan = order_data.get("notes", {}).get("plan", "basic")
        except Exception:
            pass  # Fall back to default plan
        
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Check if this payment was already processed
            cur.execute(
                "SELECT id FROM payment_logs WHERE razorpay_payment_id = %s",
                (payment_id,)
            )
            if cur.fetchone():
                return {"success": True, "message": "Payment already processed"}
            
            # Calculate new expiry
            plan_info = PLAN_PRICES.get(plan, PLAN_PRICES["basic"])
            expiry = datetime.now(timezone.utc) + timedelta(days=plan_info["duration_days"])
            
            # Update user plan
            cur.execute(
                "UPDATE users SET plan = %s, plan_expires_at = %s WHERE id = %s",
                (plan, expiry.strftime("%Y-%m-%d"), user_id)
            )
            
            # Log payment
            cur.execute(
                """INSERT INTO payment_logs (user_id, razorpay_order_id, razorpay_payment_id, plan, amount)
                   VALUES (%s, %s, %s, %s, %s)""",
                (user_id, order_id, payment_id, plan, plan_info["amount"])
            )
            
            conn.commit()
            
            return {
                "success": True,
                "plan": plan,
                "expires_at": expiry.strftime("%Y-%m-%d"),
            }
        finally:
            conn.close()

    # ── School Billing ────────────────────────────────────────────

    @staticmethod
    def get_school_plan_prices() -> Dict:
        """Get school plan prices."""
        return {
            plan: {
                "amount_paise": info["amount"],
                "amount_rupees": info["amount"] // 100,
                "label": info["label"],
                "duration_days": info["duration_days"],
                "student_limit": info["student_limit"],
            }
            for plan, info in SCHOOL_PLAN_PRICES.items()
        }

    @staticmethod
    async def create_school_order(school_id: int, plan: str) -> Dict:
        """Create Razorpay order for school upgrade."""
        plan = plan.lower()
        if plan not in SCHOOL_PLAN_PRICES:
            raise HTTPException(status_code=422, detail=f"Invalid school plan: {plan}")

        key_id, key_secret = _rzp_auth()
        plan_info = SCHOOL_PLAN_PRICES[plan]

        # Validate school exists
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, name, contact_email FROM schools WHERE id = %s", (school_id,))
            school = cur.fetchone()
            if not school:
                raise HTTPException(status_code=404, detail="School not found")
        finally:
            conn.close()

        receipt_id = f"school_{plan}_{uuid.uuid4().hex[:8]}"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{_RZP_API}/orders",
                    auth=(key_id, key_secret),
                    json={
                        "amount": plan_info["amount"],
                        "currency": "INR",
                        "receipt": receipt_id,
                        "notes": {
                            "school_id": str(school_id),
                            "plan": plan,
                            "type": "school",
                        },
                    }
                )
                if resp.status_code != 200:
                    raise HTTPException(status_code=502, detail="Failed to create order")
                order = resp.json()
        except httpx.RequestError as e:
            logger.error(f"Payment gateway error: {e}"); raise HTTPException(status_code=502, detail="Payment service temporarily unavailable. Please try again.")

        return {
            "order_id": order["id"],
            "amount": plan_info["amount"],
            "currency": "INR",
            "key_id": key_id,
            "plan": plan,
            "school_name": school[1],
        }

    @staticmethod
    def verify_school_payment(school_id: int, order_id: str, payment_id: str, signature: str) -> Dict:
        """Verify school payment and upgrade school plan."""
        key_id, key_secret = _rzp_auth()

        # Verify signature
        message = f"{order_id}|{payment_id}"
        expected_sig = hmac.new(
            key_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        if signature != expected_sig:
            raise HTTPException(status_code=400, detail="Invalid payment signature")

        # Fetch order from Razorpay to get plan from notes
        plan = "school_basic"  # Default fallback
        try:
            import httpx
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    f"{_RZP_API}/orders/{order_id}",
                    auth=(key_id, key_secret)
                )
                if resp.status_code == 200:
                    order_data = resp.json()
                    notes = order_data.get("notes", {})
                    plan = notes.get("plan", "school_basic")
                    # Verify this is a school order
                    if notes.get("type") != "school":
                        raise HTTPException(status_code=400, detail="Not a school payment")
        except HTTPException:
            raise
        except Exception:
            pass  # Fall back to default plan

        plan_info = SCHOOL_PLAN_PRICES.get(plan, SCHOOL_PLAN_PRICES["school_basic"])

        conn = get_db()
        try:
            cur = conn.cursor()

            # Check if this payment was already processed
            cur.execute(
                "SELECT id FROM payment_logs WHERE razorpay_payment_id = %s",
                (payment_id,)
            )
            if cur.fetchone():
                return {"success": True, "message": "Payment already processed"}

            # Calculate new expiry
            expiry = datetime.now(timezone.utc) + timedelta(days=plan_info["duration_days"])

            # Update school plan
            cur.execute(
                """UPDATE schools 
                   SET plan = %s, student_limit = %s, plan_expires_at = %s, updated_at = CURRENT_TIMESTAMP
                   WHERE id = %s""",
                (plan, plan_info["student_limit"], expiry.strftime("%Y-%m-%d"), school_id)
            )

            # Update all students' plans to match school plan
            user_plan = plan_info["user_plan"]
            cur.execute(
                "UPDATE users SET plan = %s WHERE school_id = %s",
                (user_plan, school_id)
            )

            # Log payment
            cur.execute(
                """INSERT INTO payment_logs (user_id, razorpay_order_id, razorpay_payment_id, plan, amount)
                   VALUES (%s, %s, %s, %s, %s)""",
                (f"school_{school_id}", order_id, payment_id, plan, plan_info["amount"])
            )

            conn.commit()

            return {
                "success": True,
                "plan": plan,
                "expires_at": expiry.strftime("%Y-%m-%d"),
                "student_limit": plan_info["student_limit"],
            }
        finally:
            conn.close()

