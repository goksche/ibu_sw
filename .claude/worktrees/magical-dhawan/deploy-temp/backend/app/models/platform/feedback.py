# Feedback Model - SQLAlchemy
# Multi-App Platform

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.core.database import Base


class FeedbackType(str, enum.Enum):
    """Feedback Type Enum"""
    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    IMPROVEMENT = "improvement"
    OTHER = "other"


class FeedbackStatus(str, enum.Enum):
    """Feedback Status Enum"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class FeedbackPriority(str, enum.Enum):
    """Feedback Priority Enum"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Feedback(Base):
    """Feedback Model - Stores feedback for apps"""
    
    __tablename__ = "feedback"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    app_id = Column(Integer, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Feedback Information
    feedback_type = Column(Enum(FeedbackType), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Enum(FeedbackPriority), default=FeedbackPriority.MEDIUM, nullable=False)
    status = Column(Enum(FeedbackStatus), default=FeedbackStatus.OPEN, nullable=False, index=True)
    
    # Attachments (JSON Array of URLs)
    attachments = Column(JSON)  # Array von Attachment-URLs
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    app = relationship("App", back_populates="feedbacks")
    user = relationship("User", back_populates="feedbacks")
    comments = relationship("FeedbackComment", back_populates="feedback", cascade="all, delete-orphan")


class FeedbackComment(Base):
    """Feedback Comments - Comments on feedback items"""
    
    __tablename__ = "feedback_comments"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    feedback_id = Column(Integer, ForeignKey("feedback.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Comment
    comment = Column(Text, nullable=False)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    feedback = relationship("Feedback", back_populates="comments")
    user = relationship("User", back_populates="feedback_comments")

