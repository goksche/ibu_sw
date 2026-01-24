# App Model - SQLAlchemy
# Multi-App Platform

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.core.database import Base


class AppStatus(str, enum.Enum):
    """App Status Enum"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPLOYING = "deploying"
    ERROR = "error"


class App(Base):
    """App Registry Model - Stores information about available apps"""
    
    __tablename__ = "apps"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # App Information
    name = Column(String(100), unique=True, index=True, nullable=False)  # z.B. "IBU_SW", "Kassensystem"
    display_name = Column(String(200), nullable=False)  # Anzeigename
    description = Column(Text)
    icon_url = Column(String(500))  # Icon URL
    
    # Routing & Container
    route_path = Column(String(100), unique=True, index=True, nullable=False)  # z.B. "/apps/ibu", "/apps/kasse"
    container_name = Column(String(200), unique=True, index=True, nullable=False)  # Docker Container Name
    docker_image = Column(String(500), nullable=False)  # Docker Image Name:Tag
    internal_port = Column(Integer, nullable=False)  # Container Port
    
    # Status & Version
    status = Column(Enum(AppStatus), default=AppStatus.INACTIVE, nullable=False)
    version = Column(String(50))
    
    # Metadata (JSON)
    metadata = Column(JSON)  # Zusätzliche Metadaten
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    permissions = relationship("UserAppPermission", back_populates="app", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="app", cascade="all, delete-orphan")
    deployments = relationship("ContainerDeployment", back_populates="app", cascade="all, delete-orphan")

