# Deployment Model - SQLAlchemy
# Multi-App Platform

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.core.database import Base


class DeploymentStatus(str, enum.Enum):
    """Deployment Status Enum"""
    DEPLOYING = "deploying"
    SUCCESS = "success"
    FAILED = "failed"


class ContainerDeployment(Base):
    """Container Deployment History - Tracks container deployments"""
    
    __tablename__ = "container_deployments"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    app_id = Column(Integer, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False, index=True)
    deployed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Deployment Information
    docker_image = Column(String(500), nullable=False)
    deployment_status = Column(Enum(DeploymentStatus), nullable=False, index=True)
    error_message = Column(Text)  # Error message if deployment failed
    
    # Timestamp
    deployed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    app = relationship("App", back_populates="deployments")
    deployer = relationship("User", foreign_keys=[deployed_by])


