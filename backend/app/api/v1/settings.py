# App Settings API – Global + User-individual

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin, require_power_admin, require_viewer_or_above, get_current_user
from app.models.app_settings import AppSettings
from app.models.user_settings import UserSettings
from app.models.user import User
from app.schemas.settings import AppSettingsPayload, UserSettingsPayload


router = APIRouter(prefix="/settings", tags=["Settings"])


def _deep_merge(base: dict, override: dict) -> dict:
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            base[key] = _deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def _load_global_settings(db: Session) -> AppSettingsPayload:
    settings_row = db.query(AppSettings).first()
    defaults = AppSettingsPayload().model_dump()
    if settings_row and isinstance(settings_row.settings_json, dict):
        merged = _deep_merge(defaults, settings_row.settings_json)
        return AppSettingsPayload(**merged)
    return AppSettingsPayload(**defaults)


def _global_user_defaults(db: Session) -> dict:
    """Extract user-relevant defaults from global settings."""
    gs = _load_global_settings(db)
    return {
        "layout": gs.placeholders.layout,
        "font_family": gs.placeholders.font_family,
        "dashboard_sort": gs.dashboard.default_sort,
        "language": gs.placeholders.language,
        "timezone": gs.placeholders.timezone,
    }


# --- Global settings (backward-compatible) ---

@router.get("", response_model=AppSettingsPayload)
async def get_settings(
    current_user=Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    return _load_global_settings(db)


@router.put("", response_model=AppSettingsPayload)
async def update_settings(
    payload: AppSettingsPayload,
    admin=Depends(require_power_admin),
    db: Session = Depends(get_db)
):
    settings_row = db.query(AppSettings).first()
    if settings_row is None:
        settings_row = AppSettings(settings_json=payload.model_dump())
        db.add(settings_row)
    else:
        settings_row.settings_json = payload.model_dump()
    db.commit()
    return payload


@router.get("/global", response_model=AppSettingsPayload)
async def get_global_settings(
    current_user=Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    return _load_global_settings(db)


@router.put("/global", response_model=AppSettingsPayload)
async def update_global_settings(
    payload: AppSettingsPayload,
    admin=Depends(require_power_admin),
    db: Session = Depends(get_db)
):
    settings_row = db.query(AppSettings).first()
    if settings_row is None:
        settings_row = AppSettings(settings_json=payload.model_dump())
        db.add(settings_row)
    else:
        settings_row.settings_json = payload.model_dump()
    db.commit()
    return payload


# --- User-individual settings ---

@router.get("/user", response_model=UserSettingsPayload)
async def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Load current user's settings. Falls back to global defaults if none exist."""
    row = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if row and isinstance(row.settings_json, dict) and row.settings_json:
        defaults = _global_user_defaults(db)
        merged = {**defaults, **row.settings_json}
        return UserSettingsPayload(**merged)

    return UserSettingsPayload(**_global_user_defaults(db))


@router.put("/user", response_model=UserSettingsPayload)
async def update_user_settings(
    payload: UserSettingsPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save current user's individual settings."""
    row = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    data = payload.model_dump()
    if row is None:
        row = UserSettings(user_id=current_user.id, settings_json=data)
        db.add(row)
    else:
        row.settings_json = data
        from datetime import datetime
        row.updated_at = datetime.utcnow()
    db.commit()
    return payload
