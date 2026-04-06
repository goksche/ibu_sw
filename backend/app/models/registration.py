from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from datetime import datetime
from app.core.database import Base
import enum


class RegistrationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class RegistrationRequest(Base):
    __tablename__ = "registration_requests"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    status = Column(SAEnum(RegistrationStatus), default=RegistrationStatus.PENDING, nullable=False)
    otp_verified = Column(Boolean, default=False, nullable=False)

    invitation_tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="SET NULL"), nullable=True)
    invitation_league_id = Column(Integer, ForeignKey("leagues.id", ondelete="SET NULL"), nullable=True)

    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reject_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
