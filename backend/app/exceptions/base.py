"""
Base exception classes for the application.
"""
from fastapi import HTTPException


class AppException(HTTPException):
    """Base application exception."""
    
    def __init__(self, status_code: int = 400, detail: str = "An error occurred"):
        super().__init__(status_code=status_code, detail=detail)


class NotFoundError(AppException):
    """Resource not found."""
    
    def __init__(self, resource: str = "Resource"):
        super().__init__(status_code=404, detail=f"{resource} not found")


class UnauthorizedError(AppException):
    """Authentication required."""
    
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(status_code=401, detail=detail)


class ForbiddenError(AppException):
    """Access denied."""
    
    def __init__(self, detail: str = "Access denied"):
        super().__init__(status_code=403, detail=detail)


class ConflictError(AppException):
    """Resource already exists."""
    
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(status_code=409, detail=detail)


class ValidationError(AppException):
    """Validation failed."""
    
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(status_code=422, detail=detail)


class RateLimitError(AppException):
    """Too many requests."""
    
    def __init__(self, detail: str = "Too many requests. Please wait and try again."):
        super().__init__(status_code=429, detail=detail)
