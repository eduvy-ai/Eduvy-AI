"""
Repository Layer - ALL database queries centralized here.
If you change the database, ONLY change files in this folder.
"""
from app.db.repositories.user import UserRepository
from app.db.repositories.squad import SquadRepository
from app.db.repositories.battle import BattleRepository
from app.db.repositories.bhool import BhoolRepository


class DB:
    """
    Central database access point.
    
    Usage in services:
        from app.db import db
        
        user = db.users.get_by_id("user-123")
        users = db.users.find({"plan": "pro"})
        db.users.update("user-123", {"xp": 100})
    """
    users = UserRepository()
    squads = SquadRepository()
    battles = BattleRepository()
    bhool = BhoolRepository()
    # Add more repositories as needed:
    # notebooks = NotebookRepository()
    # mastery = MasteryRepository()
    # etc.


db = DB()

__all__ = ["db", "DB"]
