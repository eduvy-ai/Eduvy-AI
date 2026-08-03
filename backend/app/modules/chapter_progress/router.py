"""
Chapter Progress Router - API endpoints for chapter progress tracking.
All chapter learning data: notes, summaries, quizzes, videos, flashcards, AI chat.
"""
import asyncio
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.modules.chapter_progress.schemas import (
    NoteCreate, NoteUpdate, NoteResponse,
    SummarySave, SummaryResponse,
    UploadCreate, UploadResponse,
    QuizHistorySave, QuizHistoryResponse,
    QuizBookmarkSave, QuizBookmarkResponse,
    VideoHistorySave, VideoHistoryResponse,
    VideoBookmarkSave, VideoBookmarkResponse,
    FlashcardSetSave, FlashcardSetUpdate, FlashcardSetResponse,
    ChatSessionCreate, ChatSessionResponse, ChatMessageSave, ChatMessageResponse,
)
from app.modules.chapter_progress.service import ChapterProgressService
from app.services.content_extraction import process_upload_extraction

router = APIRouter(prefix="/chapters/{chapter_id}/progress", tags=["Chapter Progress"])


# ── Notes ──────────────────────────────────────────────────────

@router.get("/notes", response_model=List[NoteResponse])
async def get_notes(
    chapter_id: int,
    user_id: str = Depends(get_current_user),
):
    """Get all notes for a chapter."""
    return await asyncio.to_thread(
        ChapterProgressService.get_notes, user_id, chapter_id
    )


@router.post("/notes", response_model=NoteResponse, status_code=201)
async def create_note(
    chapter_id: int,
    data: NoteCreate,
    user_id: str = Depends(get_current_user),
):
    """Create a new note."""
    return await asyncio.to_thread(
        ChapterProgressService.create_note, user_id, chapter_id, data
    )


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    chapter_id: int,
    note_id: int,
    data: NoteUpdate,
    user_id: str = Depends(get_current_user),
):
    """Update an existing note."""
    result = await asyncio.to_thread(
        ChapterProgressService.update_note, user_id, note_id, data
    )
    if not result:
        raise HTTPException(status_code=404, detail="Note not found")
    return result


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(
    chapter_id: int,
    note_id: int,
    user_id: str = Depends(get_current_user),
):
    """Delete a note."""
    deleted = await asyncio.to_thread(
        ChapterProgressService.delete_note, user_id, note_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")


# ── Summaries ──────────────────────────────────────────────────

@router.get("/summary")
async def get_summary(
    chapter_id: int,
    user_id: str = Depends(get_current_user),
):
    """Get summary for a chapter. Returns null if none exists."""
    result = await asyncio.to_thread(
        ChapterProgressService.get_summary, user_id, chapter_id
    )
    return result  # Returns None (null) if no summary exists


@router.post("/summary", response_model=SummaryResponse)
async def save_summary(
    chapter_id: int,
    data: SummarySave,
    user_id: str = Depends(get_current_user),
):
    """Save or update summary for a chapter."""
    return await asyncio.to_thread(
        ChapterProgressService.save_summary, user_id, chapter_id, data
    )


# ── Uploads ────────────────────────────────────────────────────

@router.get("/uploads", response_model=List[UploadResponse])
async def get_uploads(
    chapter_id: int,
    user_id: str = Depends(get_current_user),
):
    """Get all uploads for a chapter."""
    return await asyncio.to_thread(
        ChapterProgressService.get_uploads, user_id, chapter_id
    )


@router.post("/uploads", response_model=UploadResponse, status_code=201)
async def create_upload(
    chapter_id: int,
    data: UploadCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    """Record a new upload and trigger content extraction."""
    result = await asyncio.to_thread(
        ChapterProgressService.create_upload, user_id, chapter_id, data
    )
    
    # Trigger content extraction in background
    background_tasks.add_task(
        asyncio.run,
        process_upload_extraction(result.id, data.url, data.file_type)
    )
    
    return result


@router.delete("/uploads/{upload_id}", status_code=204)
async def delete_upload(
    chapter_id: int,
    upload_id: int,
    user_id: str = Depends(get_current_user),
):
    """Delete an upload record."""
    deleted = await asyncio.to_thread(
        ChapterProgressService.delete_upload, user_id, upload_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Upload not found")


@router.get("/uploads/content")
async def get_extracted_content(
    chapter_id: int,
    user_id: str = Depends(get_current_user),
):
    """Get combined extracted text from all uploads for AI context."""
    content = await asyncio.to_thread(
        ChapterProgressService.get_extracted_content, user_id, chapter_id
    )
    return {"content": content, "has_content": bool(content)}


# ── Quiz History ───────────────────────────────────────────────

@router.get("/quiz/history", response_model=List[QuizHistoryResponse])
async def get_quiz_history(
    chapter_id: int,
    user_id: str = Depends(get_current_user),
):
    """Get quiz history for a chapter."""
    return await asyncio.to_thread(
        ChapterProgressService.get_quiz_history, user_id, chapter_id
    )


@router.post("/quiz/history", response_model=QuizHistoryResponse, status_code=201)
async def save_quiz_history(
    chapter_id: int,
    data: QuizHistorySave,
    user_id: str = Depends(get_current_user),
):
    """Save a quiz attempt."""
    return await asyncio.to_thread(
        ChapterProgressService.save_quiz_history, user_id, chapter_id, data
    )


@router.delete("/quiz/history/{history_id}", status_code=204)
async def delete_quiz_history(
    chapter_id: int,
    history_id: int,
    user_id: str = Depends(get_current_user),
):
    """Delete a quiz history entry."""
    deleted = await asyncio.to_thread(
        ChapterProgressService.delete_quiz_history, user_id, history_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="History entry not found")


# ── Quiz Bookmarks ─────────────────────────────────────────────

@router.get("/quiz/bookmarks", response_model=List[QuizBookmarkResponse])
async def get_quiz_bookmarks(
    chapter_id: int,
    user_id: str = Depends(get_current_user),
):
    """Get quiz bookmarks for a chapter."""
    return await asyncio.to_thread(
        ChapterProgressService.get_quiz_bookmarks, user_id, chapter_id
    )


@router.post("/quiz/bookmarks", response_model=QuizBookmarkResponse, status_code=201)
async def save_quiz_bookmark(
    chapter_id: int,
    data: QuizBookmarkSave,
    user_id: str = Depends(get_current_user),
):
    """Bookmark a quiz question."""
    return await asyncio.to_thread(
        ChapterProgressService.save_quiz_bookmark, user_id, chapter_id, data
    )


@router.delete("/quiz/bookmarks/{bookmark_id}", status_code=204)
async def delete_quiz_bookmark(
    chapter_id: int,
    bookmark_id: int,
    user_id: str = Depends(get_current_user),
):
    """Remove a quiz bookmark."""
    deleted = await asyncio.to_thread(
        ChapterProgressService.delete_quiz_bookmark, user_id, bookmark_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Bookmark not found")


# ── Video History ──────────────────────────────────────────────

@router.get("/videos/history", response_model=List[VideoHistoryResponse])
async def get_video_history(
    chapter_id: int,
    user_id: str = Depends(get_current_user),
):
    """Get video watch history for a chapter."""
    return await asyncio.to_thread(
        ChapterProgressService.get_video_history, user_id, chapter_id
    )


@router.post("/videos/history", response_model=VideoHistoryResponse, status_code=201)
async def save_video_history(
    chapter_id: int,
    data: VideoHistorySave,
    user_id: str = Depends(get_current_user),
):
    """Record a video watch."""
    return await asyncio.to_thread(
        ChapterProgressService.save_video_history, user_id, chapter_id, data
    )


@router.delete("/videos/history/{history_id}", status_code=204)
async def delete_video_history(
    chapter_id: int,
    history_id: int,
    user_id: str = Depends(get_current_user),
):
    """Delete a video history entry."""
    deleted = await asyncio.to_thread(
        ChapterProgressService.delete_video_history, user_id, history_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="History entry not found")


# ── Video Bookmarks ────────────────────────────────────────────

@router.get("/videos/bookmarks", response_model=List[VideoBookmarkResponse])
async def get_video_bookmarks(
    chapter_id: int,
    user_id: str = Depends(get_current_user),
):
    """Get video bookmarks for a chapter."""
    return await asyncio.to_thread(
        ChapterProgressService.get_video_bookmarks, user_id, chapter_id
    )


@router.post("/videos/bookmarks", response_model=VideoBookmarkResponse, status_code=201)
async def save_video_bookmark(
    chapter_id: int,
    data: VideoBookmarkSave,
    user_id: str = Depends(get_current_user),
):
    """Bookmark a video."""
    return await asyncio.to_thread(
        ChapterProgressService.save_video_bookmark, user_id, chapter_id, data
    )


@router.delete("/videos/bookmarks/{bookmark_id}", status_code=204)
async def delete_video_bookmark(
    chapter_id: int,
    bookmark_id: int,
    user_id: str = Depends(get_current_user),
):
    """Remove a video bookmark."""
    deleted = await asyncio.to_thread(
        ChapterProgressService.delete_video_bookmark, user_id, bookmark_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Bookmark not found")


# ── Flashcard Sets ─────────────────────────────────────────────

@router.get("/flashcards", response_model=List[FlashcardSetResponse])
async def get_flashcard_sets(
    chapter_id: int,
    user_id: str = Depends(get_current_user),
):
    """Get flashcard sets for a chapter."""
    return await asyncio.to_thread(
        ChapterProgressService.get_flashcard_sets, user_id, chapter_id
    )


@router.post("/flashcards", response_model=FlashcardSetResponse, status_code=201)
async def save_flashcard_set(
    chapter_id: int,
    data: FlashcardSetSave,
    user_id: str = Depends(get_current_user),
):
    """Create a new flashcard set."""
    return await asyncio.to_thread(
        ChapterProgressService.save_flashcard_set, user_id, chapter_id, data
    )


@router.put("/flashcards/{set_id}", response_model=FlashcardSetResponse)
async def update_flashcard_set(
    chapter_id: int,
    set_id: int,
    data: FlashcardSetUpdate,
    user_id: str = Depends(get_current_user),
):
    """Update a flashcard set (name, cards, mastery)."""
    result = await asyncio.to_thread(
        ChapterProgressService.update_flashcard_set, user_id, set_id, data
    )
    if not result:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    return result


@router.delete("/flashcards/{set_id}", status_code=204)
async def delete_flashcard_set(
    chapter_id: int,
    set_id: int,
    user_id: str = Depends(get_current_user),
):
    """Delete a flashcard set."""
    deleted = await asyncio.to_thread(
        ChapterProgressService.delete_flashcard_set, user_id, set_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Flashcard set not found")


# ── AI Chat Sessions ───────────────────────────────────────────

@router.get("/chat/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    chapter_id: int,
    user_id: str = Depends(get_current_user),
):
    """Get AI chat sessions for a chapter."""
    return await asyncio.to_thread(
        ChapterProgressService.get_chat_sessions, user_id, chapter_id
    )


@router.post("/chat/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_chat_session(
    chapter_id: int,
    data: Optional[ChatSessionCreate] = None,
    user_id: str = Depends(get_current_user),
):
    """Create a new chat session."""
    title = data.title if data else "New Chat"
    return await asyncio.to_thread(
        ChapterProgressService.create_chat_session, user_id, chapter_id, title
    )


@router.get("/chat/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    chapter_id: int,
    session_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get messages in a chat session."""
    return await asyncio.to_thread(
        ChapterProgressService.get_chat_messages, user_id, session_id
    )


@router.post("/chat/sessions/{session_id}/messages", response_model=ChatMessageResponse, status_code=201)
async def save_chat_message(
    chapter_id: int,
    session_id: str,
    data: ChatMessageSave,
    user_id: str = Depends(get_current_user),
):
    """Save a message to a chat session."""
    return await asyncio.to_thread(
        ChapterProgressService.save_chat_message, user_id, chapter_id, session_id, data
    )


@router.delete("/chat/sessions/{session_id}", status_code=204)
async def delete_chat_session(
    chapter_id: int,
    session_id: str,
    user_id: str = Depends(get_current_user),
):
    """Delete a chat session and its messages."""
    deleted = await asyncio.to_thread(
        ChapterProgressService.delete_chat_session, user_id, session_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Chat session not found")
