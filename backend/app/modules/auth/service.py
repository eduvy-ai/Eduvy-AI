"""
Auth Service - Business logic for authentication.
NO database code here - uses db repository.
"""
import re
from typing import Dict
from fastapi import HTTPException

from app.db import db
from app.core.security import hash_password, verify_password, create_token


# Strict email regex
_EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')


class AuthService:
    """Authentication business logic."""
    
    @staticmethod
    def register(
        email: str,
        password: str,
        name: str,
        standard: str = "Class 10",
        board: str = "CBSE",
        language: str = "English",
        subjects: list = None,
        mobile: str = "",
        parent_mobile: str = ""
    ) -> Dict:
        """
        Register a new user account.
        Returns: {"token": str, "profile": dict}
        """
        # Validate email
        email = email.strip().lower()
        if not email or not _EMAIL_RE.match(email):
            raise HTTPException(status_code=422, detail="Valid email address required")
        
        # Validate password
        if len(password) < 8:
            raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
        
        # Validate name
        name = name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name required")
        
        # Check if email already exists
        if db.users.get_by_email(email):
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        
        # Create user
        user = db.users.create_user(
            email=email,
            password_hash=hash_password(password),
            name=name,
            standard=standard,
            board=board,
            language=language,
            subjects=subjects or [],
            mobile=mobile,
            parent_mobile=parent_mobile
        )
        
        # Generate token
        token = create_token(user["id"])
        
        # Remove sensitive data
        user.pop("password_hash", None)
        
        return {"token": token, "profile": user}
    
    @staticmethod
    def login(email: str, password: str) -> Dict:
        """
        Authenticate user with email and password.
        Returns: {"token": str, "profile": dict}
        """
        email = email.strip().lower()
        
        # Generic error message to prevent user enumeration
        INVALID = "Invalid email or password"
        
        # Find user
        user = db.users.get_by_email(email)
        if not user:
            raise HTTPException(status_code=401, detail=INVALID)
        
        # Verify password
        if not user.get("password_hash") or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=401, detail=INVALID)
        
        # Generate token
        token = create_token(user["id"])
        
        # Remove sensitive data
        user.pop("password_hash", None)
        
        return {"token": token, "profile": user}
    
    @staticmethod
    def get_profile(user_id: str) -> Dict:
        """Get user profile by ID."""
        user = db.users.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Remove sensitive data
        user.pop("password_hash", None)
        
        return user
