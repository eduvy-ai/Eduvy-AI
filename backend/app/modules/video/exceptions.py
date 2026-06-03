"""
Video Module — Custom exceptions.
"""
from fastapi import HTTPException


class VideoNotFoundException(HTTPException):
    def __init__(self, video_id: str = ""):
        super().__init__(status_code=404, detail=f"Video not found: {video_id}")


class VideoGenerationError(HTTPException):
    def __init__(self, msg: str = "Video generation failed"):
        super().__init__(status_code=500, detail=msg)


class VideoAccessDeniedError(HTTPException):
    def __init__(self):
        super().__init__(status_code=403, detail="Access denied to this video")
