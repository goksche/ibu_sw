# Dependencies - FastAPI Dependencies
# Multi-App Platform / FinalStage: POWER_ADMIN muss überall wie Admin+ gelten (Lesen/Schreiben).

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.models.platform import App, UserAppPermission

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
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
            detail="User account is inactive",
        )

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Admin oder Power Admin (IBU: Power Admin ≥ Admin für Verwaltungs-Endpunkte)."""
    if current_user.role not in (UserRole.ADMIN, UserRole.POWER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin role required.",
        )
    return current_user


def require_power_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.POWER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Power admin role required.",
        )
    return current_user


def require_user_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (
        UserRole.USER,
        UserRole.ADMIN,
        UserRole.POWER_ADMIN,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. User or Admin role required.",
        )
    return current_user


def require_viewer_or_above(current_user: User = Depends(get_current_user)) -> User:
    """Alle authentifizierten Standard-Rollen inkl. Power Admin (Leselisten, GET …)."""
    if current_user.role not in (
        UserRole.VIEWER,
        UserRole.USER,
        UserRole.ADMIN,
        UserRole.POWER_ADMIN,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Authentication required.",
        )
    return current_user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def check_app_permission(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> App:
    if current_user.role in (UserRole.ADMIN, UserRole.POWER_ADMIN):
        app = db.query(App).filter(App.id == app_id).first()
        if app is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="App not found",
            )
        return app

    permission = (
        db.query(UserAppPermission)
        .filter(
            UserAppPermission.user_id == current_user.id,
            UserAppPermission.app_id == app_id,
        )
        .first()
    )

    if permission is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this app",
        )

    app = db.query(App).filter(App.id == app_id).first()
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found",
        )

    if app.status.value != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="App is not active",
        )

    return app


def get_user_app_permissions(
    user_id: int,
    db: Session = Depends(get_db),
) -> List[int]:
    permissions = db.query(UserAppPermission.app_id).filter(
        UserAppPermission.user_id == user_id
    ).all()
    return [perm[0] for perm in permissions]
