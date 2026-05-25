from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PageViewCreate(BaseModel):
    path: str
    query: Optional[str] = None
    referrer: Optional[str] = None
    title: Optional[str] = None


class PageViewLogResponse(PageViewCreate):
    id: int
    user_id: Optional[int] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LoginEventLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    email: Optional[str] = None
    event_type: str
    success: bool
    reason: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApiRequestLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    method: str
    path: str
    status_code: int
    duration_ms: int
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminActionLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    method: str
    path: str
    status_code: int
    action: str
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
