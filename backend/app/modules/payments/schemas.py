"""
Payments Schemas - Request/Response validation models.
"""
from pydantic import BaseModel


class CreateOrderRequest(BaseModel):
    plan: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# School billing
class CreateSchoolOrderRequest(BaseModel):
    school_id: int
    plan: str  # school_basic | school_pro


class VerifySchoolPaymentRequest(BaseModel):
    school_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
