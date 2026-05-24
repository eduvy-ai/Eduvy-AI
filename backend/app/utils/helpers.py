"""
Helper utility functions.
"""
import uuid
from datetime import datetime


def generate_uuid() -> str:
    """Generate a new UUID string."""
    return str(uuid.uuid4())


def get_today() -> str:
    """Get today's date as ISO string."""
    return datetime.now().date().isoformat()


def get_now() -> str:
    """Get current datetime as ISO string."""
    return datetime.now().isoformat()
