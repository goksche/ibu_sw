# Dashboard API
# Multi-App Platform

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_user_app_permissions
from app.models.user import User, UserRole
from app.models.platform import App, AppStatus
from app.schemas.platform.app import AppResponse

router = APIRouter(prefix="/platform", tags=["Platform"])


@router.get("/dashboard/apps", response_model=List[AppResponse])
async def get_user_apps(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of apps available to the current user.
    Admins see all active apps, regular users see only apps they have permission for.
    """
    if current_user.role == UserRole.ADMIN:
        # Admins see all active apps
        apps = db.query(App).filter(App.status == AppStatus.ACTIVE).all()
    else:
        # Regular users see only apps they have permission for
        app_ids = get_user_app_permissions(current_user.id, db)
        apps = db.query(App).filter(
            App.id.in_(app_ids),
            App.status == AppStatus.ACTIVE
        ).all()
    
    return apps


@router.get("/app/{app_id}", response_model=AppResponse)
async def get_app_details(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific app.
    User must have permission to access this app (or be admin).
    """
    # Admins can access any app
    if current_user.role == UserRole.ADMIN:
        app = db.query(App).filter(App.id == app_id).first()
    else:
        # Check permission
        from app.models.platform import UserAppPermission
        permission = db.query(UserAppPermission).filter(
            UserAppPermission.user_id == current_user.id,
            UserAppPermission.app_id == app_id
        ).first()
        
        if permission is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this app"
            )
        
        app = db.query(App).filter(App.id == app_id).first()
    
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    return app


