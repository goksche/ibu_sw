# User Model - SQLAlchemy
# v1.2.0-alpha.2

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.core.database import Base


class UserRole(str, enum.Enum):
    """User Roles Enum"""
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


class User(Base):
    """User Model for Authentication and Authorization"""
    
    __tablename__ = "users"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # User Information
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Role
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    # tournaments = relationship("Tournament", back_populates="creator")
    app_permissions = relationship("UserAppPermission", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    feedback_comments = relationship("FeedbackComment", back_populates="user", cascade="all, delete-orphan")

