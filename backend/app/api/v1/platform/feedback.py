# Feedback API
# Multi-App Platform

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.platform import Feedback, FeedbackComment, FeedbackStatus, FeedbackPriority
from app.schemas.platform.feedback import (
    FeedbackCreate, FeedbackUpdate, FeedbackResponse,
    FeedbackCommentCreate, FeedbackCommentResponse
)

router = APIRouter(prefix="/platform/feedback", tags=["Feedback"])


@router.get("", response_model=List[FeedbackResponse])
async def get_feedback(
    app_id: Optional[int] = None,
    status: Optional[FeedbackStatus] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get feedback list.
    Regular users see only their own feedback.
    Admins see all feedback.
    """
    query = db.query(Feedback)
    
    # Regular users see only their own feedback
    if current_user.role.value not in ("admin", "power_admin"):
        query = query.filter(Feedback.user_id == current_user.id)
    
    # Filter by app_id if provided
    if app_id:
        query = query.filter(Feedback.app_id == app_id)
    
    # Filter by status if provided
    if status:
        query = query.filter(Feedback.status == status)
    
    feedbacks = query.order_by(
        Feedback.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return feedbacks


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    feedback_data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new feedback"""
    # Verify app exists
    from app.models.platform import App
    app = db.query(App).filter(App.id == feedback_data.app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    # Create feedback
    new_feedback = Feedback(
        app_id=feedback_data.app_id,
        user_id=current_user.id,
        feedback_type=feedback_data.feedback_type,
        title=feedback_data.title,
        description=feedback_data.description,
        priority=feedback_data.priority,
        attachments=feedback_data.attachments
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return new_feedback


@router.get("/{feedback_id}", response_model=FeedbackResponse)
async def get_feedback_details(
    feedback_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get feedback details"""
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if feedback is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    # Regular users can only see their own feedback
    if current_user.role.value not in ("admin", "power_admin") and feedback.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this feedback"
        )
    
    return feedback


@router.put("/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback(
    feedback_id: int,
    feedback_data: FeedbackUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update feedback (Admin only)"""
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if feedback is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    # Only admins can update feedback
    if current_user.role.value not in ("admin", "power_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update feedback"
        )
    
    # Update fields if provided
    if feedback_data.status is not None:
        feedback.status = feedback_data.status
    
    if feedback_data.priority is not None:
        feedback.priority = feedback_data.priority
    
    if feedback_data.title is not None:
        feedback.title = feedback_data.title
    
    if feedback_data.description is not None:
        feedback.description = feedback_data.description
    
    db.commit()
    db.refresh(feedback)
    
    return feedback


@router.post("/{feedback_id}/comments", response_model=FeedbackCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    feedback_id: int,
    comment_data: FeedbackCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add comment to feedback"""
    # Verify feedback exists
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if feedback is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    # Create comment
    new_comment = FeedbackComment(
        feedback_id=feedback_id,
        user_id=current_user.id,
        comment=comment_data.comment
    )
    
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    return new_comment


@router.get("/{feedback_id}/comments", response_model=List[FeedbackCommentResponse])
async def get_feedback_comments(
    feedback_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comments for feedback"""
    # Verify feedback exists
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if feedback is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    # Regular users can only see comments on their own feedback
    if current_user.role.value not in ("admin", "power_admin") and feedback.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view comments for this feedback"
        )
    
    comments = db.query(FeedbackComment).filter(
        FeedbackComment.feedback_id == feedback_id
    ).order_by(FeedbackComment.created_at.asc()).all()
    
    return comments


