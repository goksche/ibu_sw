# Match Model - SQLAlchemy
# v1.3.0

from sqlalchemy import Column, Integer, ForeignKey, CheckConstraint, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class GroupMatch(Base):
    """Group Match Model (spiele)"""
    
    __tablename__ = "group_matches"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    
    # Match Information
    round = Column(Integer, nullable=False)  # Spielrunde innerhalb der Gruppe
    match_no = Column(Integer, nullable=False)  # Match-Number innerhalb der Runde
    is_decision_match = Column(Boolean, default=False, nullable=False)  # Entscheidungsspiel (nur für Rang, nicht für Statistiken)
    
    # Players
    player1_id = Column(Integer, ForeignKey("participants.id", ondelete="SET NULL"), nullable=True)
    player2_id = Column(Integer, ForeignKey("participants.id", ondelete="SET NULL"), nullable=True)
    
    # Scores
    score1 = Column(Integer, nullable=True)
    score2 = Column(Integer, nullable=True)
    
    # Relationships
    tournament = relationship("Tournament", backref="group_matches")
    group = relationship("Group", backref="matches")
    player1 = relationship("Participant", foreign_keys=[player1_id], backref="group_matches_p1")
    player2 = relationship("Participant", foreign_keys=[player2_id], backref="group_matches_p2")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('score1 >= 0 OR score1 IS NULL', name='check_score1_non_negative'),
        CheckConstraint('score2 >= 0 OR score2 IS NULL', name='check_score2_non_negative'),
    )


class KnockoutMatch(Base):
    """Knockout Match Model (ko_spiele)"""
    
    __tablename__ = "knockout_matches"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    tournament_id = Column(Integer, ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    
    # Match Information
    round = Column(Integer, nullable=False)  # KO-Runde (1=Viertelfinale, 2=Halbfinale, etc.)
    match_no = Column(Integer, nullable=False)  # Match-Number innerhalb der Runde
    
    # Players
    player1_id = Column(Integer, ForeignKey("participants.id", ondelete="SET NULL"), nullable=True)
    player2_id = Column(Integer, ForeignKey("participants.id", ondelete="SET NULL"), nullable=True)
    
    # Scores
    score1 = Column(Integer, nullable=True)
    score2 = Column(Integer, nullable=True)
    
    # Relationships
    tournament = relationship("Tournament", backref="knockout_matches")
    player1 = relationship("Participant", foreign_keys=[player1_id], backref="ko_matches_p1")
    player2 = relationship("Participant", foreign_keys=[player2_id], backref="ko_matches_p2")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('score1 >= 0 OR score1 IS NULL', name='check_ko_score1_non_negative'),
        CheckConstraint('score2 >= 0 OR score2 IS NULL', name='check_ko_score2_non_negative'),
    )

