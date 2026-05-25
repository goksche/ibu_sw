# Permission Model - SQLAlchemy
# Multi-App Platform

from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class UserAppPermission(Base):
    """User-App Berechtigungen - Definiert welche User Zugriff auf welche Apps haben"""
    
    __tablename__ = "user_app_permissions"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    app_id = Column(Integer, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Metadata
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin der Berechtigung erteilt hat
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="app_permissions")
    app = relationship("App", back_populates="permissions")
    granter = relationship("User", foreign_keys=[granted_by])
    
    # Unique Constraint
    __table_args__ = (
        UniqueConstraint('user_id', 'app_id', name='uq_user_app_permission'),
    )

