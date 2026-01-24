# Deployment Schemas - Pydantic Models
# Multi-App Platform

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.platform import DeploymentStatus


class DeploymentBase(BaseModel):
    """Base Deployment Schema"""
    app_id: int
    docker_image: str


class DeploymentCreate(DeploymentBase):
    """Schema for creating a deployment"""
    pass


class DeploymentResponse(DeploymentBase):
    """Schema for deployment response"""
    id: int
    deployed_by: int
    deployment_status: DeploymentStatus
    error_message: Optional[str] = None
    deployed_at: datetime
    
    class Config:
        from_attributes = True


