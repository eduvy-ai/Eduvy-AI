from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class APIResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool = True
    message: str = "Success"
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""
    data: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


def success_response(data: Any = None, message: str = "Success") -> Dict:
    """Create a success response."""
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def error_response(message: str = "Error", errors: List[str] = None) -> Dict:
    """Create an error response."""
    return {
        "success": False,
        "message": message,
        "errors": errors or [],
    }


def paginated_response(
    data: List[Any],
    total: int,
    page: int,
    page_size: int
) -> Dict:
    """Create a paginated response."""
    total_pages = (total + page_size - 1) // page_size
    return {
        "data": data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
