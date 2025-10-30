# Group Model - SQLAlchemy
# v1.3.0

from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Group(Base):
    """Group Model for Tournament Groups"""
    
    __tablename__ = "groups"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Key
    tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    
    # Group Information
    name = Column(String(50), nullable=False)
    
    # Relationships
    tournament = relationship("Tournament", backref="groups")
    participants = relationship(
        "GroupParticipant",
        back_populates="group",
        cascade="all, delete-orphan"
    )


class GroupParticipant(Base):
    """Group-Participant Junction Table"""
    
    __tablename__ = "group_participants"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    group = relationship("Group", back_populates="participants")
    participant = relationship("Participant", backref="group_entries")

