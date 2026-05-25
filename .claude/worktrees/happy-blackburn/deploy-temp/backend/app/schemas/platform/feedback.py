# Feedback Schemas - Pydantic Models
# Multi-App Platform

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.platform import FeedbackType, FeedbackStatus, FeedbackPriority


class FeedbackBase(BaseModel):
    """Base Feedback Schema"""
    app_id: int
    feedback_type: FeedbackType
    title: str = Field(..., max_length=200)
    description: str
    priority: FeedbackPriority = FeedbackPriority.MEDIUM
    attachments: Optional[List[str]] = None  # List of attachment URLs


class FeedbackCreate(FeedbackBase):
    """Schema for creating feedback"""
    pass


class FeedbackUpdate(BaseModel):
    """Schema for updating feedback (Admin only)"""
    status: Optional[FeedbackStatus] = None
    priority: Optional[FeedbackPriority] = None
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None


class FeedbackResponse(FeedbackBase):
    """Schema for feedback response"""
    id: int
    user_id: int
    status: FeedbackStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FeedbackCommentBase(BaseModel):
    """Base Feedback Comment Schema"""
    comment: str


class FeedbackCommentCreate(FeedbackCommentBase):
    """Schema for creating a feedback comment"""
    feedback_id: int


class FeedbackCommentResponse(FeedbackCommentBase):
    """Schema for feedback comment response"""
    id: int
    feedback_id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

