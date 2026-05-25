# App Settings Model - SQLAlchemy
# Global settings storage

from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, JSON
from app.core.database import Base


class AppSettings(Base):
    """Global application settings (single-row table)"""

    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    settings_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
