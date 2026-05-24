"""
Eduvy-AI Backend Entry Point
=============================

This file re-exports the app from the new modular structure.
Run with: uvicorn main:app --reload --port 8000
"""
from app.main_new import app

__all__ = ["app"]
