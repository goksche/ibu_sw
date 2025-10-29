# Tournament Model - SQLAlchemy
# v1.2.0-alpha.2

from sqlalchemy import Column, Integer, String, Date, Boolean, Enum, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.core.database import Base


class TournamentMode(str, enum.Enum):
    """Tournament Mode Enum"""
    ROUND_ROBIN = "round_robin"
    KNOCKOUT = "knockout"
    COMBINED = "combined"


class TournamentStatus(str, enum.Enum):
    """Tournament Status Enum"""
    PLANNED = "planned"
    RUNNING = "running"
    COMPLETED = "completed"


class Tournament(Base):
    """Tournament Model"""
    
    __tablename__ = "tournaments"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Tournament Information
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True)
    
    # Tournament Settings
    mode = Column(Enum(TournamentMode), default=TournamentMode.ROUND_ROBIN, nullable=False)
    status = Column(Enum(TournamentStatus), default=TournamentStatus.PLANNED, nullable=False)
    
    # Group Phase Settings
    has_group_phase = Column(Boolean, default=True, nullable=False)
    groups_count = Column(Integer, default=0, nullable=False)
    participants_per_group = Column(Integer, nullable=True)
    
    # KO Phase Settings
    has_ko_phase = Column(Boolean, default=False, nullable=False)
    ko_participants = Column(Integer, default=0, nullable=False)  # Wie viele aus Gruppenphase
    
    # Settings
    show_matches = Column(Boolean, default=True, nullable=False)
    show_tables = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Foreign Keys
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    creator = relationship("User", backref="tournaments")

