from sqlalchemy import Column, Integer, String, Text, DateTime, Date, JSON, ForeignKey, Table
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
    mode_presets = Column(JSON, nullable=True)

    status = Column(String(20), nullable=False, default="geplant")
    league_mode = Column(String(20), nullable=False, default="liga")
    tournament_mode = Column(String(20), nullable=False, default="combined")
    placement_points = Column(JSON, nullable=True)
    masters_ko_count = Column(Integer, default=8)
    auto_tournament_count = Column(Integer, default=0)
    auto_tournament_mode = Column(String(20), nullable=True)
    auto_tournament_settings = Column(JSON, nullable=True)

    visibility = Column(String(10), default="public", nullable=False)

    season_type = Column(String(20), default="year")
    season_year = Column(String(20), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    participants = relationship("Participant", secondary=league_participants, backref="leagues")
    tournaments = relationship("Tournament", secondary=league_tournaments, backref="leagues")
