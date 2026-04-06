from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class ShareCreate(BaseModel):
    email: EmailStr
    permission: str = Field(default="view", pattern="^(view|edit)$")


class ShareResponse(BaseModel):
    id: int
    tournament_id: Optional[int] = None
    league_id: Optional[int] = None
    shared_with_user_id: Optional[int] = None
    shared_with_email: Optional[str] = None
    permission: str
    created_at: datetime

    class Config:
        from_attributes = True


class VisibilityUpdate(BaseModel):
    visibility: str = Field(..., pattern="^(public|shared|private)$")
