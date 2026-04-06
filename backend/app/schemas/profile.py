from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    club: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = Field(None, max_length=1000)
    is_private: Optional[bool] = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    display_name: Optional[str] = None
    club: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_private: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfilePublic(BaseModel):
    """Public profile view (for other users)."""
    user_id: int
    display_name: Optional[str] = None
    club: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class ParticipantMatch(BaseModel):
    participant_id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    club: Optional[str] = None
    already_linked: bool = False
