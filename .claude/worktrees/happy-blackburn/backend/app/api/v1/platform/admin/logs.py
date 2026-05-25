from collections import deque
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.logs import PageViewLog, LoginEventLog, ApiRequestLog, AdminActionLog
from app.schemas.logs import (
    PageViewLogResponse,
    LoginEventLogResponse,
    ApiRequestLogResponse,
    AdminActionLogResponse
)


router = APIRouter(prefix="/platform/admin/logs", tags=["Admin - Logs"])


@router.get("/page-views", response_model=List[PageViewLogResponse])
async def list_page_views(
    skip: int = 0,
    limit: int = Query(100, ge=1, le=500),
    q: Optional[str] = None,
    user_id: Optional[int] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(PageViewLog)
    if user_id is not None:
        query = query.filter(PageViewLog.user_id == user_id)
    if q:
        query = query.filter(PageViewLog.path.ilike(f"%{q}%"))
    if start:
        query = query.filter(PageViewLog.created_at >= start)
    if end:
        query = query.filter(PageViewLog.created_at <= end)
    return query.order_by(PageViewLog.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/login-events", response_model=List[LoginEventLogResponse])
async def list_login_events(
    skip: int = 0,
    limit: int = Query(100, ge=1, le=500),
    q: Optional[str] = None,
    user_id: Optional[int] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(LoginEventLog)
    if user_id is not None:
        query = query.filter(LoginEventLog.user_id == user_id)
    if q:
        query = query.filter(
            (LoginEventLog.username.ilike(f"%{q}%")) |
            (LoginEventLog.email.ilike(f"%{q}%")) |
            (LoginEventLog.event_type.ilike(f"%{q}%"))
        )
    if start:
        query = query.filter(LoginEventLog.created_at >= start)
    if end:
        query = query.filter(LoginEventLog.created_at <= end)
    return query.order_by(LoginEventLog.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/api-requests", response_model=List[ApiRequestLogResponse])
async def list_api_requests(
    skip: int = 0,
    limit: int = Query(100, ge=1, le=500),
    q: Optional[str] = None,
    user_id: Optional[int] = None,
    status_code: Optional[int] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(ApiRequestLog)
    if user_id is not None:
        query = query.filter(ApiRequestLog.user_id == user_id)
    if status_code is not None:
        query = query.filter(ApiRequestLog.status_code == status_code)
    if q:
        query = query.filter(ApiRequestLog.path.ilike(f"%{q}%"))
    if start:
        query = query.filter(ApiRequestLog.created_at >= start)
    if end:
        query = query.filter(ApiRequestLog.created_at <= end)
    return query.order_by(ApiRequestLog.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/admin-actions", response_model=List[AdminActionLogResponse])
async def list_admin_actions(
    skip: int = 0,
    limit: int = Query(100, ge=1, le=500),
    q: Optional[str] = None,
    user_id: Optional[int] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AdminActionLog)
    if user_id is not None:
        query = query.filter(AdminActionLog.user_id == user_id)
    if q:
        query = query.filter(AdminActionLog.path.ilike(f"%{q}%"))
    if start:
        query = query.filter(AdminActionLog.created_at >= start)
    if end:
        query = query.filter(AdminActionLog.created_at <= end)
    return query.order_by(AdminActionLog.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/nginx")
async def get_nginx_logs(
    tail: int = Query(200, ge=1, le=2000),
    admin=Depends(require_admin)
):
    log_path = "/var/log/nginx/access.log"
    try:
        with open(log_path, "r", encoding="utf-8", errors="replace") as file:
            lines = list(deque(file, maxlen=tail))
        return {"lines": [line.rstrip("\n") for line in lines], "tail": tail}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Nginx log file not found")
