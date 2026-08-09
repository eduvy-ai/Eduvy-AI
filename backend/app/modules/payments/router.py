"""
Payments Router - API endpoints for Razorpay integration.
"""
import asyncio
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.core.dependencies import get_current_user
from app.modules.payments.schemas import (
    CreateOrderRequest, VerifyPaymentRequest,
    CreateSchoolOrderRequest, VerifySchoolPaymentRequest,
)
from app.modules.payments.service import PaymentsService

router = APIRouter(prefix="/payments", tags=["Payments"])

_bearer = HTTPBearer(auto_error=False)
_JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def get_admin_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> int:
    """Verify admin JWT token."""
    if not creds:
        raise HTTPException(status_code=401, detail="Admin auth required")
    try:
        payload = jwt.decode(creds.credentials, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access only")
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(uid)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


@router.get("/plans")
async def get_plan_prices():
    """Get plan prices (public)."""
    return await asyncio.to_thread(PaymentsService.get_plan_prices)


@router.post("/create-order")
async def create_order(
    data: CreateOrderRequest,
    current_user: str = Depends(get_current_user)
):
    """Create Razorpay order."""
    return await PaymentsService.create_order(current_user, data.plan)


@router.post("/verify")
async def verify_payment(
    data: VerifyPaymentRequest,
    current_user: str = Depends(get_current_user)
):
    """Verify payment and upgrade plan."""
    return await asyncio.to_thread(
        PaymentsService.verify_payment,
        current_user,
        data.razorpay_order_id,
        data.razorpay_payment_id,
        data.razorpay_signature,
    )


# ── School Billing Endpoints ──────────────────────────────────────

@router.get("/school-plans")
async def get_school_plan_prices():
    """Get school plan prices (public)."""
    return PaymentsService.get_school_plan_prices()


@router.post("/school/create-order")
async def create_school_order(
    data: CreateSchoolOrderRequest,
    admin_id: int = Depends(get_admin_user),
):
    """Create Razorpay order for school upgrade (admin only)."""
    return await PaymentsService.create_school_order(data.school_id, data.plan)


@router.post("/school/verify")
async def verify_school_payment(
    data: VerifySchoolPaymentRequest,
    admin_id: int = Depends(get_admin_user),
):
    """Verify school payment and upgrade plan (admin only)."""
    return await asyncio.to_thread(
        PaymentsService.verify_school_payment,
        data.school_id,
        data.razorpay_order_id,
        data.razorpay_payment_id,
        data.razorpay_signature,
    )
