"""
Database seeding script.
Run this to populate the database with initial data.
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import AsyncSessionLocal
from app.modules.users.query import create_user
from app.modules.users.schema import UserCreate
from app.core.constants import Roles


async def seed_admin():
    """Create default admin user."""
    async with AsyncSessionLocal() as db:
        admin_data = UserCreate(
            email="admin@eduvy.ai",
            password="admin123",
            name="Admin User",
            role=Roles.ADMIN,
        )
        try:
            await create_user(db, admin_data)
            print("Admin user created successfully")
        except Exception as e:
            print(f"Admin user already exists or error: {e}")


async def seed_sample_data():
    """Seed sample data for development."""
    async with AsyncSessionLocal() as db:
        # Add sample users
        users = [
            UserCreate(email="user1@example.com", password="password123", name="User One"),
            UserCreate(email="user2@example.com", password="password123", name="User Two"),
        ]
        for user_data in users:
            try:
                await create_user(db, user_data)
                print(f"Created user: {user_data.email}")
            except Exception as e:
                print(f"User {user_data.email} already exists or error: {e}")


async def main():
    """Run all seed functions."""
    print("Starting database seeding...")
    await seed_admin()
    await seed_sample_data()
    print("Database seeding completed!")


if __name__ == "__main__":
    asyncio.run(main())
