# Access Request Model - SQLAlchemy
# Zugangs-Anfragen von der Landing Page (echter Betrieb)

from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.core.database import Base


class AccessRequest(Base):
    """Zugangs-Anfrage von der Landing Page."""

    __tablename__ = "access_requests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=False)
    sport = Column(String(100), nullable=False)
    organisation = Column(String(200), nullable=True)
    source = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
