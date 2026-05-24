"""
Drishti Schemas - Request/Response validation models.
"""
from pydantic import BaseModel


class NoteCreate(BaseModel):
    student_id: str
    message: str
