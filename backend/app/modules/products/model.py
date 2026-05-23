from sqlalchemy import Column, String, Float, Integer, Text, ARRAY
from sqlalchemy.dialects.postgresql import JSON
from app.db.base import BaseModel


class Product(BaseModel):
    """Product model."""
    __tablename__ = "products"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String(100), nullable=True)
    stock = Column(Integer, default=0)
    images = Column(JSON, default=[])
    status = Column(String(50), default="active")
