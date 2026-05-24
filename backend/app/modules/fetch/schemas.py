"""
Fetch Schemas - Request/Response validation models.
"""
from pydantic import BaseModel
from typing import List


class FetchRequest(BaseModel):
    url: str


class FetchResponse(BaseModel):
    content: str
    isYouTube: bool


class VideoResult(BaseModel):
    id: str
    title: str
    channel: str
    thumbnail: str
    duration: int
    views: int
    uploaded: str


class VideoInfo(BaseModel):
    title: str
    channel: str
    description: str
    duration: int
    views: int
    thumbnail: str
    captions: str
