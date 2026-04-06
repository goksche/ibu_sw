from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from app.core.database import Base


class TournamentShare(Base):
    __tablename__ = "tournament_shares"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    shared_with_email = Column(String(200), nullable=True)
    permission = Column(String(10), nullable=False, default="view")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("tournament_id", "shared_with_user_id", name="uq_tournament_share_user"),
        UniqueConstraint("tournament_id", "shared_with_email", name="uq_tournament_share_email"),
    )
