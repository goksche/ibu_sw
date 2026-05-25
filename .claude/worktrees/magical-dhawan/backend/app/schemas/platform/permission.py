# Permission Schemas - Pydantic Models
# Multi-App Platform

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PermissionBase(BaseModel):
    """Base Permission Schema"""
    user_id: int
    app_id: int


class PermissionCreate(PermissionBase):
    """Schema for creating a permission"""
    granted_by: Optional[int] = None  # Admin user ID who grants the permission


class PermissionResponse(PermissionBase):
    """Schema for permission response"""
    id: int
    granted_at: datetime
    granted_by: Optional[int] = None
    
    class Config:
        from_attributes = True


