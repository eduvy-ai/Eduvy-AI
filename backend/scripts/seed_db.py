"""
Script to seed the database with initial data.
Run with: python -m scripts.seed_db
"""
import asyncio
from app.db.seed import main

if __name__ == "__main__":
    asyncio.run(main())
