"""
Chapters Module - Chapter management for chapter-centric learning.
"""
from app.modules.chapters.router import router
from app.modules.chapters.service import ChapterService

__all__ = ["router", "ChapterService"]
