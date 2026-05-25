# Admin App Management API
# Multi-App Platform

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.models.platform import App, AppStatus
from app.schemas.platform.app import AppCreate, AppUpdate, AppResponse

router = APIRouter(prefix="/platform/admin/apps", tags=["Admin - Apps"])


@router.get("", response_model=List[AppResponse])
async def get_all_apps(
    skip: int = 0,
    limit: int = 100,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all apps (Admin only)"""
    apps = db.query(App).offset(skip).limit(limit).all()
    return apps


@router.post("", response_model=AppResponse, status_code=status.HTTP_201_CREATED)
async def create_app(
    app_data: AppCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new app (Admin only)"""
    # Check if name already exists
    existing_app = db.query(App).filter(App.name == app_data.name).first()
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="App name already exists"
        )
    
    # Check if route_path already exists
    existing_route = db.query(App).filter(App.route_path == app_data.route_path).first()
    if existing_route:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Route path already exists"
        )
    
    # Check if container_name already exists
    existing_container = db.query(App).filter(App.container_name == app_data.container_name).first()
    if existing_container:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Container name already exists"
        )
    
    # Create new app
    new_app = App(
        name=app_data.name,
        display_name=app_data.display_name,
        description=app_data.description,
        icon_url=app_data.icon_url,
        route_path=app_data.route_path,
        container_name=app_data.container_name,
        docker_image=app_data.docker_image,
        internal_port=app_data.internal_port,
        status=app_data.status,
        version=app_data.version,
        app_metadata=app_data.app_metadata
    )
    
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    
    return new_app


@router.get("/{app_id}", response_model=AppResponse)
async def get_app(
    app_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get app by ID (Admin only)"""
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    return app


@router.put("/{app_id}", response_model=AppResponse)
async def update_app(
    app_id: int,
    app_data: AppUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update app (Admin only)"""
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    # Update fields if provided
    if app_data.display_name is not None:
        app.display_name = app_data.display_name
    
    if app_data.description is not None:
        app.description = app_data.description
    
    if app_data.icon_url is not None:
        app.icon_url = app_data.icon_url
    
    if app_data.status is not None:
        app.status = app_data.status
    
    if app_data.version is not None:
        app.version = app_data.version
    
    if app_data.app_metadata is not None:
        app.app_metadata = app_data.app_metadata
    
    db.commit()
    db.refresh(app)
    
    return app


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_app(
    app_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete app (Admin only)"""
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    db.delete(app)
    db.commit()
    
    return None


@router.put("/{app_id}/status", response_model=AppResponse)
async def update_app_status(
    app_id: int,
    new_status: AppStatus,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update app status (Admin only)"""
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    app.status = new_status
    db.commit()
    db.refresh(app)
    
    return app

