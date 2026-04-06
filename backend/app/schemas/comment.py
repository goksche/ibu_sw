"""Pydantic schemas for comments and reactions."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


class CommentCreate(BaseModel):
    context: str = Field(..., max_length=50)
    content: str = Field(..., min_length=1, max_length=2000)


class ReactionCreate(BaseModel):
    reaction: str = Field(..., pattern="^(like|fire|trophy|laugh)$")


class ReactionSummary(BaseModel):
    like: int = 0
    fire: int = 0
    trophy: int = 0
    laugh: int = 0
    my_reactions: List[str] = []


class CommentResponse(BaseModel):
    id: int
    tournament_id: int
    user_id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    context: str
    content: str
    reactions: ReactionSummary
    created_at: datetime
    is_deleted: bool = False

    class Config:
        from_attributes = True


class CommentListResponse(BaseModel):
    comments: List[CommentResponse]
    total: int
