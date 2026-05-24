"""
Profile Service - Business logic for user profiles.
"""
import json
from typing import Dict, Optional
from fastapi import HTTPException

from app.db import db


class ProfileService:
    """Profile business logic."""
    
    @staticmethod
    def require_own(user_id: str, current_user: str):
        """Raises 403 if user_id doesn't match current_user."""
        if user_id != current_user:
            raise HTTPException(status_code=403, detail="Access denied")
    
    @staticmethod
    def create_profile(
        id: str,
        name: str,
        mobile: str = "",
        parent_mobile: str = "",
        standard: str = "Class 10",
        board: str = "CBSE",
        language: str = "English",
        subjects: list = None
    ) -> Dict:
        """Create a new user profile."""
        # Check if exists
        if db.users.get_by_id(id):
            raise HTTPException(status_code=409, detail="Profile already exists")
        
        # Create
        user = db.users.create({
            "id": id,
            "name": name,
            "mobile": mobile,
            "parent_mobile": parent_mobile,
            "standard": standard,
            "board": board,
            "language": language,
            "subjects": subjects or []
        })
        
        user.pop("password_hash", None)
        return user
    
    @staticmethod
    def get_profile(user_id: str) -> Dict:
        """Get user profile by ID."""
        user = db.users.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        user.pop("password_hash", None)
        return user
    
    @staticmethod
    def update_profile(user_id: str, **data) -> Dict:
        """Update user profile."""
        # Check exists
        if not db.users.get_by_id(user_id):
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Filter None values
        updates = {k: v for k, v in data.items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update
        user = db.users.update(user_id, updates)
        user.pop("password_hash", None)
        return user
    
    @staticmethod
    def add_xp(user_id: str, points: int) -> Dict:
        """Add XP to user."""
        if not db.users.get_by_id(user_id):
            raise HTTPException(status_code=404, detail="Profile not found")
        
        new_xp = db.users.add_xp(user_id, points)
        return {"xp": new_xp}
    
    @staticmethod
    def update_streak(user_id: str, streak: int) -> Dict:
        """Update user streak."""
        if not db.users.get_by_id(user_id):
            raise HTTPException(status_code=404, detail="Profile not found")
        
        from app.utils.helpers import get_today
        db.users.update_streak(user_id, streak, get_today())
        return {"streak": streak}
    
    @staticmethod
    def update_ai_config(
        user_id: str,
        provider: str,
        model: str,
        api_key: str = "",
        ai_keys: dict = None
    ) -> Dict:
        """Update AI configuration for user."""
        user = db.users.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Merge keys
        existing_keys = user.get("ai_keys") or {}
        if isinstance(existing_keys, str):
            try:
                existing_keys = json.loads(existing_keys)
            except:
                existing_keys = {}
        
        if ai_keys and isinstance(ai_keys, dict):
            existing_keys.update(ai_keys)
        elif api_key:
            existing_keys[provider] = api_key
        
        db.users.update(user_id, {
            "ai_provider": provider,
            "ai_model": model,
            "ai_key": api_key,
            "ai_keys": existing_keys
        })
        
        return {"provider": provider, "model": model}
