from sqlalchemy import Column, String, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from app.db.base import BaseModel


class Order(BaseModel):
    """Order model."""
    __tablename__ = "orders"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    items = Column(JSON, default=[])
    subtotal = Column(Float, default=0)
    tax = Column(Float, default=0)
    total = Column(Float, default=0)
    status = Column(String(50), default="pending")
    shipping_address = Column(Text, nullable=True)
    payment_method = Column(String(100), nullable=True)
    payment_status = Column(String(50), default="pending")

    # Relationships
    user = relationship("User", backref="orders")
