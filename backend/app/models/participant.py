# Participant Model - SQLAlchemy
# v1.2.0-alpha.2

from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Participant(Base):
    """Participant Model"""
    
    __tablename__ = "participants"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Participant Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    
    # Optional Fields
    club = Column(String(200), nullable=True)
    license_number = Column(String(50), nullable=True, index=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    tournament_entries = relationship("TournamentParticipant", back_populates="participant", cascade="all, delete-orphan")


class TournamentParticipant(Base):
    """Tournament-Participant Junction Table"""
    
    __tablename__ = "tournament_participants"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('tournament_id', 'participant_id', name='uq_tournament_participant'),
    )
    
    # Relationships
    tournament = relationship("Tournament", backref="tournament_participants")
    participant = relationship("Participant", back_populates="tournament_entries")

