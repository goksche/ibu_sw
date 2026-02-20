from datetime import datetime

from sqlalchemy import Column, Integer, String, Boolean, DateTime

from app.core.database import Base


class PageViewLog(Base):
    __tablename__ = "page_view_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    path = Column(String(512), nullable=False)
    query = Column(String(1024), nullable=True)
    referrer = Column(String(1024), nullable=True)
    title = Column(String(255), nullable=True)
    ip = Column(String(64), nullable=True)
    user_agent = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class LoginEventLog(Base):
    __tablename__ = "login_event_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    username = Column(String(100), nullable=True)
    email = Column(String(200), nullable=True)
    event_type = Column(String(32), nullable=False)
    success = Column(Boolean, default=False, nullable=False)
    reason = Column(String(255), nullable=True)
    ip = Column(String(64), nullable=True)
    user_agent = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ApiRequestLog(Base):
    __tablename__ = "api_request_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    method = Column(String(10), nullable=False)
    path = Column(String(512), nullable=False)
    status_code = Column(Integer, nullable=False)
    duration_ms = Column(Integer, nullable=False)
    ip = Column(String(64), nullable=True)
    user_agent = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AdminActionLog(Base):
    __tablename__ = "admin_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    method = Column(String(10), nullable=False)
    path = Column(String(512), nullable=False)
    status_code = Column(Integer, nullable=False)
    action = Column(String(255), nullable=False)
    ip = Column(String(64), nullable=True)
    user_agent = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
