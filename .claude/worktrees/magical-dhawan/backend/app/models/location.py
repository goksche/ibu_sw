# Location & Spielfeld Models - Spielorte und Spielfelder
# v1.4.0

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Location(Base):
    """Spielort (Location) – z.B. Halle, Sportzentrum"""

    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    spielfelder = relationship("Spielfeld", back_populates="location", cascade="all, delete-orphan", order_by="Spielfeld.sort_order,Spielfeld.id")


class Spielfeld(Base):
    """Spielfeld (Dartscheibe/Board) – gehört zu einer Location"""

    __tablename__ = "spielfelder"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)  # z.B. "Scheibe 1", "Feld A"
    sort_order = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    location = relationship("Location", back_populates="spielfelder")
