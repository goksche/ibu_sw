from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


league_participants = Table(
    "league_participants",
    Base.metadata,
    Column("league_id", Integer, ForeignKey("leagues.id", ondelete="CASCADE"), primary_key=True),
    Column("participant_id", Integer, ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True),
)


league_tournaments = Table(
    "league_tournaments",
    Base.metadata,
    Column("league_id", Integer, ForeignKey("leagues.id", ondelete="CASCADE"), primary_key=True),
    Column("tournament_id", Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), primary_key=True),
)


class League(Base):
    """League/Championship model"""

    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    scoring_schema = Column(JSON, nullable=True)  # e.g. { "win": 3, "draw": 1, "loss": 0 }
    mode_presets = Column(JSON, nullable=True)  # settings for future tournaments

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    participants = relationship("Participant", secondary=league_participants, backref="leagues")
    tournaments = relationship("Tournament", secondary=league_tournaments, backref="leagues")
