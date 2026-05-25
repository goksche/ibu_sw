# App Schemas - Pydantic Models
# Multi-App Platform

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.platform import AppStatus


class AppBase(BaseModel):
    """Base App Schema"""
    name: str = Field(..., max_length=100, description="Unique app name (e.g., 'IBU_SW', 'Kassensystem')")
    display_name: str = Field(..., max_length=200, description="Display name for the app")
    description: Optional[str] = None
    icon_url: Optional[str] = Field(None, max_length=500)
    route_path: str = Field(..., max_length=100, description="Route path (e.g., '/apps/ibu')")
    container_name: str = Field(..., max_length=200, description="Docker container name")
    docker_image: str = Field(..., max_length=500, description="Docker image name:tag")
    internal_port: int = Field(..., ge=1, le=65535, description="Container internal port")
    version: Optional[str] = Field(None, max_length=50)
    metadata: Optional[Dict[str, Any]] = None


class AppCreate(AppBase):
    """Schema for creating a new app"""
    status: AppStatus = AppStatus.INACTIVE


class AppUpdate(BaseModel):
    """Schema for updating an app"""
    display_name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    icon_url: Optional[str] = Field(None, max_length=500)
    status: Optional[AppStatus] = None
    version: Optional[str] = Field(None, max_length=50)
    metadata: Optional[Dict[str, Any]] = None


class AppResponse(AppBase):
    """Schema for app response"""
    id: int
    status: AppStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

