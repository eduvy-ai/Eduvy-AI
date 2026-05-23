from sqlalchemy import Column, String, Boolean
from app.db.base import BaseModel


class User(BaseModel):
    """User model."""
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), default="user")
    is_active = Column(Boolean, default=True)
    avatar = Column(String(500), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
