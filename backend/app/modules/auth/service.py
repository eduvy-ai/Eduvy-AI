"""
Auth Service - Business logic for authentication.
NO database code here - uses db repository.
"""
import re
from typing import Dict
from fastapi import HTTPException

from app.db import db, get_db
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
        parent_mobile: str = "",
        stream: str = ""
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
        
        # Auto-assign subjects from curriculum if none provided
        final_subjects = subjects or []
        if not final_subjects:
            try:
                from app.modules.curriculum.service import CurriculumService
                board_slug = board.lower().replace(" ", "-")
                std_slug = standard.lower().replace(" ", "-")
                medium_slug = language.lower().replace(" ", "-")
                final_subjects = CurriculumService.get_subjects(board_slug, std_slug, medium_slug, stream)
            except Exception:
                final_subjects = []
        
        # Create user
        user = db.users.create_user(
            email=email,
            password_hash=hash_password(password),
            name=name,
            standard=standard,
            board=board,
            language=language,
            subjects=final_subjects,
            mobile=mobile,
            parent_mobile=parent_mobile,
            stream=stream,
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
        Also checks admin_users table — if admin, returns is_admin flag.
        Returns: {"token": str, "profile": dict, "is_admin"?: bool, "must_change_password"?: bool}
        """
        from datetime import date
        
        email = email.strip().lower()
        
        # Generic error message to prevent user enumeration
        INVALID = "Invalid email or password"
        
        # First try student users table
        user = db.users.get_by_email(email)
        if user:
            if not user.get("password_hash") or not verify_password(password, user["password_hash"]):
                raise HTTPException(status_code=401, detail=INVALID)
            
            # Check if user is suspended
            if user.get("is_suspended"):
                raise HTTPException(status_code=403, detail="Your account has been suspended. Please contact your school administrator.")
            
            # Check if school is suspended (for school students)
            if user.get("school_id"):
                conn = get_db()
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT is_active FROM schools WHERE id = %s", (user["school_id"],))
                    school_row = cur.fetchone()
                    if school_row and not school_row["is_active"]:
                        raise HTTPException(status_code=403, detail="Your school has been suspended. Please contact your school administrator.")
                finally:
                    conn.close()
            
            # Update last_active on login
            db.users.update(user["id"], {"last_active": date.today().isoformat()})
            
            token = create_token(user["id"])
            user.pop("password_hash", None)
            
            # Check if user needs to change password (OTP flow)
            must_change = user.get("must_change_password", False)
            
            response = {"token": token, "profile": user}
            if must_change:
                response["must_change_password"] = True
            return response
        
        # If not found in students, try admin_users table
        from app.modules.admin.service import AdminService
        try:
            admin_result = AdminService.login(email, password)
            # Return admin response with is_admin flag
            return {
                "token": admin_result["token"],
                "profile": admin_result["user"],
                "is_admin": True,
            }
        except HTTPException:
            pass
        
        # Neither student nor admin found
        raise HTTPException(status_code=401, detail=INVALID)
    
    @staticmethod
    def get_profile(user_id: str) -> Dict:
        """Get user profile by ID."""
        user = db.users.get_by_id(user_id)
        if not user:
            # Return 401 not 404 - if token is valid but user deleted, 
            # treat as "not authenticated" to force re-login
            raise HTTPException(status_code=401, detail="User not found")
        
        # Remove sensitive data
        user.pop("password_hash", None)
        
        return user
    
    @staticmethod
    def change_password(user_id: str, new_password: str, clear_must_change: bool = True) -> Dict:
        """
        Change user password. Optionally clears must_change_password flag.
        Used for first-login password change flow.
        """
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        
        user = db.users.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Hash new password
        new_hash = hash_password(new_password)
        
        # Update password and clear flag
        update_data = {"password_hash": new_hash}
        if clear_must_change:
            update_data["must_change_password"] = False
            update_data["temp_password"] = ""
        
        db.users.update(user_id, update_data)
        
        return {"ok": True, "message": "Password changed successfully"}
