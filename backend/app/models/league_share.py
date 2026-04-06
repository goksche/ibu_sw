from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from app.core.database import Base


class LeagueShare(Base):
    __tablename__ = "league_shares"

    id = Column(Integer, primary_key=True, index=True)
    league_id = Column(Integer, ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    shared_with_email = Column(String(200), nullable=True)
    permission = Column(String(10), nullable=False, default="view")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("league_id", "shared_with_user_id", name="uq_league_share_user"),
        UniqueConstraint("league_id", "shared_with_email", name="uq_league_share_email"),
    )
