# Dependencies - FastAPI Dependencies
# Multi-App Platform

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.models.platform import App, UserAppPermission

# HTTP Bearer Token Security
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    Raises HTTPException if token is invalid or user not found.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username: str = payload.get("sub")
    user_id: int = payload.get("user_id")
    
    if username is None or user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require admin role.
    Raises HTTPException if user is not an admin.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin role required."
        )
    return current_user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional dependency to get current user.
    Returns None if no token is provided or token is invalid.
    """
    if credentials is None:
        return None
    
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def check_app_permission(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> App:
    """
    Dependency to check if user has permission to access an app.
    Admins have access to all apps.
    Raises HTTPException if user doesn't have permission.
    """
    # Admins have access to all apps
    if current_user.role == UserRole.ADMIN:
        app = db.query(App).filter(App.id == app_id).first()
        if app is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="App not found"
            )
        return app
    
    # Check if user has permission for this app
    permission = db.query(UserAppPermission).filter(
        UserAppPermission.user_id == current_user.id,
        UserAppPermission.app_id == app_id
    ).first()
    
    if permission is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this app"
        )
    
    # Check if app exists and is active
    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    if app.status.value != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="App is not active"
        )
    
    return app


def get_user_app_permissions(
    user_id: int,
    db: Session = Depends(get_db)
) -> List[int]:
    """
    Get list of app IDs that a user has permission to access.
    """
    permissions = db.query(UserAppPermission.app_id).filter(
        UserAppPermission.user_id == user_id
    ).all()
    return [perm[0] for perm in permissions]

