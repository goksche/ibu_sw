# Info API Endpoints

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal

router = APIRouter(prefix="/info", tags=["Info"])


@router.get("/version")
async def get_version():
    """Get application version"""
    return {
        "version": settings.APP_VERSION,
        "name": settings.APP_NAME,
    }


@router.get("/diagnostics")
async def get_diagnostics():
    """Public diagnostics (no secrets) for support and smoke checks."""
    db_status = "unknown"
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            db_status = "ok"
        finally:
            db.close()
    except Exception:
        db_status = "error"

    return {
        "version": settings.APP_VERSION,
        "name": settings.APP_NAME,
        "debug": settings.DEBUG,
        "deploy_label": settings.DEPLOY_LABEL or None,
        "database": db_status,
    }
