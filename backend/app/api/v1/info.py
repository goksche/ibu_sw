# Info API Endpoints
# v1.4.0

from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/info", tags=["Info"])


@router.get("/version")
async def get_version():
    """Get application version"""
    return {
        "version": settings.APP_VERSION,
        "name": settings.APP_NAME
    }


