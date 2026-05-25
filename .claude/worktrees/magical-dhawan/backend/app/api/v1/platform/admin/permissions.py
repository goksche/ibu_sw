# Admin Permission Management API
# Multi-App Platform

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.models.platform import UserAppPermission, App
from app.schemas.platform.permission import PermissionCreate, PermissionResponse

router = APIRouter(prefix="/platform/admin/permissions", tags=["Admin - Permissions"])


@router.get("/user/{user_id}", response_model=List[PermissionResponse])
async def get_user_permissions(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all permissions for a user (Admin only)"""
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    permissions = db.query(UserAppPermission).filter(
        UserAppPermission.user_id == user_id
    ).all()
    
    return permissions


@router.get("/app/{app_id}", response_model=List[PermissionResponse])
async def get_app_permissions(
    app_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all permissions for an app (Admin only)"""
    # Verify app exists
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    permissions = db.query(UserAppPermission).filter(
        UserAppPermission.app_id == app_id
    ).all()
    
    return permissions


@router.post("", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
async def create_permission(
    permission_data: PermissionCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Grant permission to user for app (Admin only)"""
    # Verify user exists
    user = db.query(User).filter(User.id == permission_data.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify app exists
    app = db.query(App).filter(App.id == permission_data.app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    # Check if permission already exists
    existing = db.query(UserAppPermission).filter(
        UserAppPermission.user_id == permission_data.user_id,
        UserAppPermission.app_id == permission_data.app_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission already exists"
        )
    
    # Create permission
    new_permission = UserAppPermission(
        user_id=permission_data.user_id,
        app_id=permission_data.app_id,
        granted_by=permission_data.granted_by or admin.id
    )
    
    db.add(new_permission)
    db.commit()
    db.refresh(new_permission)
    
    return new_permission


@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_permission(
    permission_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Revoke permission (Admin only)"""
    permission = db.query(UserAppPermission).filter(
        UserAppPermission.id == permission_id
    ).first()
    
    if permission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    
    db.delete(permission)
    db.commit()
    
    return None


