"""
Global exception handlers.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.exceptions.base import AppException


def register_exception_handlers(app: FastAPI):
    """Register global exception handlers."""
    
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
    
    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        # Log the error in production
        # logger.error(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
