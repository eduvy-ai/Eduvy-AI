from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class OrderItem(BaseModel):
    product_id: str
    product_name: Optional[str] = None
    quantity: int
    price: float = 0
    total: float = 0


class OrderBase(BaseModel):
    shipping_address: str
    payment_method: str


class OrderCreate(OrderBase):
    items: List[OrderItem]


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    shipping_address: Optional[str] = None


class OrderResponse(BaseModel):
    id: str
    user_id: str
    items: List[OrderItem]
    subtotal: float
    tax: float
    total: float
    status: str
    shipping_address: Optional[str]
    payment_method: Optional[str]
    payment_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrdersListResponse(BaseModel):
    data: List[OrderResponse]
    total: int
    page: int
    page_size: int
