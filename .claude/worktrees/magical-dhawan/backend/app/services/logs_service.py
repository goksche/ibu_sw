from datetime import datetime, timedelta
from typing import Optional, Tuple

from app.core.config import settings
from app.core.security import decode_access_token
from app.models.logs import PageViewLog, LoginEventLog, ApiRequestLog, AdminActionLog


_last_cleanup_at: Optional[datetime] = None
_cleanup_interval = timedelta(hours=6)


def extract_client_ip(request) -> Optional[str]:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def extract_user_agent(request) -> Optional[str]:
    return request.headers.get("user-agent")


def extract_auth_payload(request) -> Optional[dict]:
    auth = request.headers.get("authorization")
    if not auth:
        return None
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    if not token:
        return None
    return decode_access_token(token)


def get_user_context(request) -> Tuple[Optional[int], Optional[str]]:
    payload = extract_auth_payload(request)
    if not payload:
        return None, None
    return payload.get("user_id"), payload.get("role")


def maybe_cleanup_old_logs(db) -> None:
    global _last_cleanup_at
    now = datetime.utcnow()
    if _last_cleanup_at and (now - _last_cleanup_at) < _cleanup_interval:
        return

    cutoff = now - timedelta(days=settings.LOG_RETENTION_DAYS)
    db.query(PageViewLog).filter(PageViewLog.created_at < cutoff).delete(synchronize_session=False)
    db.query(LoginEventLog).filter(LoginEventLog.created_at < cutoff).delete(synchronize_session=False)
    db.query(ApiRequestLog).filter(ApiRequestLog.created_at < cutoff).delete(synchronize_session=False)
    db.query(AdminActionLog).filter(AdminActionLog.created_at < cutoff).delete(synchronize_session=False)
    db.commit()
    _last_cleanup_at = now
