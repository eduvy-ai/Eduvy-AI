"""
Referrals Schemas - Request/Response validation models.
"""
from pydantic import BaseModel


class ApplyCodeRequest(BaseModel):
    code: str
