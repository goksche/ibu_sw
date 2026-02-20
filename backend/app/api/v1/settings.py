# App Settings API

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin, require_viewer_or_above
from app.models.app_settings import AppSettings
from app.schemas.settings import AppSettingsPayload


router = APIRouter(prefix="/settings", tags=["Settings"])


def _deep_merge(base: dict, override: dict) -> dict:
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            base[key] = _deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def _default_payload() -> AppSettingsPayload:
    return AppSettingsPayload()


@router.get("", response_model=AppSettingsPayload)
async def get_settings(
    current_user=Depends(require_viewer_or_above),
    db: Session = Depends(get_db)
):
    settings_row = db.query(AppSettings).first()
    defaults = _default_payload().model_dump()
    if settings_row and isinstance(settings_row.settings_json, dict):
        merged = _deep_merge(defaults, settings_row.settings_json)
        return AppSettingsPayload(**merged)
    return AppSettingsPayload(**defaults)


@router.put("", response_model=AppSettingsPayload)
async def update_settings(
    payload: AppSettingsPayload,
    admin=Depends(require_admin),
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

