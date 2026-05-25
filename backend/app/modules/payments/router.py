"""
Payments Router - API endpoints for Razorpay integration.
"""
import asyncio
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.payments.schemas import CreateOrderRequest, VerifyPaymentRequest
from app.modules.payments.service import PaymentsService

router = APIRouter(prefix="/payments", tags=["Payments"])


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
