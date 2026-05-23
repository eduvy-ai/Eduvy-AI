---
applyTo: "**/backend/app/**/*.py"
---

# FastAPI Backend Patterns

## Module Structure

Each module follows: `router → service → query → schema → exceptions`

```
app/modules/users/
├── __init__.py      # Module exports (no router import)
├── router.py        # API endpoints
├── service.py       # Business logic
├── query.py         # Database operations
├── schema.py        # Pydantic models
├── model.py         # SQLAlchemy models
└── exceptions.py    # Module-specific exceptions
```

## Router (`router.py`)

Define API endpoints - delegate logic to service:

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependency import get_current_active_user
from app.modules.users import schema, service

router = APIRouter()


@router.get("/{user_id}", response_model=schema.UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get user by ID."""
    return await service.get_user(db, user_id)


@router.post("/", response_model=schema.UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: schema.UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user)
):
    """Create new user (admin only)."""
    return await service.create_user(db, data)
```

## Service (`service.py`)

Business logic - orchestrates queries and validates:

```python
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users import query, schema
from app.modules.users.exceptions import UserNotFoundException, EmailAlreadyExistsException
from app.core.security import get_password_hash


async def get_user(db: AsyncSession, user_id: str) -> schema.UserResponse:
    """Get user by ID with business validation."""
    user = await query.get_user_by_id(db, user_id)
    if not user:
        raise UserNotFoundException(user_id)
    return schema.UserResponse.model_validate(user)


async def create_user(db: AsyncSession, data: schema.UserCreate) -> schema.UserResponse:
    """Create user with validation."""
    # Check for existing email
    existing = await query.get_user_by_email(db, data.email)
    if existing:
        raise EmailAlreadyExistsException(data.email)
    
    # Hash password
    hashed_password = get_password_hash(data.password)
    
    # Create user
    user = await query.create_user(db, data, hashed_password)
    return schema.UserResponse.model_validate(user)
```

## Query (`query.py`)

Database operations only - no business logic:

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.model import User
from app.modules.users.schema import UserCreate


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    """Get user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Get user by email."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: UserCreate, hashed_password: str) -> User:
    """Create new user."""
    user = User(
        email=data.email,
        name=data.name,
        hashed_password=hashed_password,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

## Schema (`schema.py`)

Pydantic models for request/response:

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None


class UserResponse(UserBase):
    id: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UsersListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
```

## Model (`model.py`)

SQLAlchemy models:

```python
from sqlalchemy import Column, String, Boolean, DateTime, func
from app.db.base import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

## Exceptions (`exceptions.py`)

Module-specific exceptions:

```python
from fastapi import HTTPException, status


class UserNotFoundException(HTTPException):
    def __init__(self, user_id: str = None):
        detail = f"User not found: {user_id}" if user_id else "User not found"
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class EmailAlreadyExistsException(HTTPException):
    def __init__(self, email: str = None):
        detail = f"Email already registered: {email}" if email else "Email already registered"
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
```

## Dependencies

Use FastAPI dependencies for auth:

```python
from app.core.dependency import get_current_user, get_current_active_user, get_current_admin_user

@router.get("/me")
async def get_me(current_user = Depends(get_current_active_user)):
    return current_user

@router.delete("/{id}")
async def delete_user(id: str, admin = Depends(get_current_admin_user)):
    # Only admins can delete
    ...
```

## Avoiding Circular Imports

1. Never import router in module `__init__.py`
2. Import routers directly in `main.py`
3. Use lazy imports if needed in dependencies
