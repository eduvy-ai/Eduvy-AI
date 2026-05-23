"""
Script to create an admin user.
Run with: python -m scripts.create_admin
"""
import asyncio
import sys

from app.db.database import AsyncSessionLocal
from app.modules.users.query import create_user, get_user_by_email
from app.modules.users.schema import UserCreate
from app.core.constants import Roles


async def create_admin_user(email: str, password: str, name: str):
    """Create an admin user."""
    async with AsyncSessionLocal() as db:
        # Check if user exists
        existing = await get_user_by_email(db, email)
        if existing:
            print(f"User with email {email} already exists")
            return
        
        # Create admin user
        user_data = UserCreate(
            email=email,
            password=password,
            name=name,
            role=Roles.ADMIN,
        )
        user = await create_user(db, user_data)
        print(f"Admin user created: {user.email}")


async def main():
    if len(sys.argv) < 4:
        print("Usage: python -m scripts.create_admin <email> <password> <name>")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    name = " ".join(sys.argv[3:])
    
    await create_admin_user(email, password, name)


if __name__ == "__main__":
    asyncio.run(main())
