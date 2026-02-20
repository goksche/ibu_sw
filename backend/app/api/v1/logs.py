from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.logs import PageViewLog
from app.schemas.logs import PageViewCreate, PageViewLogResponse
from app.services.logs_service import extract_client_ip, extract_user_agent, extract_auth_payload, maybe_cleanup_old_logs


router = APIRouter(prefix="/logs", tags=["Logs"])


@router.post("/page-views", response_model=PageViewLogResponse)
async def track_page_view(
    payload: PageViewCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    auth_payload = extract_auth_payload(request)
    user_id = auth_payload.get("user_id") if auth_payload else None

    log = PageViewLog(
        user_id=user_id,
        path=payload.path,
        query=payload.query,
        referrer=payload.referrer,
        title=payload.title,
        ip=extract_client_ip(request),
        user_agent=extract_user_agent(request)
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    try:
        maybe_cleanup_old_logs(db)
    except Exception:
        pass
    return log
