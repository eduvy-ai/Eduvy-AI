"""
Standard API response helpers.
"""
from typing import Any, Optional


def success_response(data: Any = None, message: str = "Success") -> dict:
    """Standard success response."""
    return {
        "success": True,
        "message": message,
        "data": data
    }


def error_response(message: str = "Error", code: str = None) -> dict:
    """Standard error response."""
    response = {
        "success": False,
        "message": message
    }
    if code:
        response["code"] = code
    return response
