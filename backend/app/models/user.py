# User Model - SQLAlchemy
# v1.2.0-alpha.2

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.core.database import Base


class UserRole(str, enum.Enum):
    """User Roles Enum – power_admin hat höchste Berechtigung"""
    POWER_ADMIN = "power_admin"
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
    app_permissions = relationship("UserAppPermission", foreign_keys="[UserAppPermission.user_id]", back_populates="user", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    feedback_comments = relationship("FeedbackComment", back_populates="user", cascade="all, delete-orphan")


class OTPCode(Base):
    """OTP Code Model for Email-based Authentication"""

    __tablename__ = "otp_codes"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign Key to User
    user_id = Column(Integer, index=True, nullable=False)

    # OTP Information
    email = Column(String(100), nullable=False)
    otp_code = Column(String(6), nullable=False)
    purpose = Column(String(20), default="login", nullable=False)  # login, password_reset, etc.

    # Expiration
    expires_at = Column(DateTime, nullable=False)

    # Status
    is_used = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def is_expired(self) -> bool:
        """Check if OTP code is expired"""
        return datetime.utcnow() > self.expires_at

    def is_valid(self) -> bool:
        """Check if OTP code is valid (not used and not expired)"""
        return not self.is_used and not self.is_expired()

