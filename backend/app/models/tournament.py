# Tournament Model - SQLAlchemy
# v1.2.0-alpha.2

from sqlalchemy import Column, Integer, String, Date, Boolean, Enum, ForeignKey, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from typing import List, Dict, Any
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


class KOStructure(str, enum.Enum):
    """KO Phase Structure Enum"""
    SINGLE_ELIMINATION = "single_elimination"  # Einfach-KO
    SINGLE_ELIMINATION_WITH_THIRD = "single_elimination_with_third"  # Einfach-KO mit Spiel um Platz 3
    SINGLE_ELIMINATION_WITH_RANKING = "single_elimination_with_ranking"  # Einfach-KO mit Platzierungsspielen
    CONSOLATION_BRACKET = "consolation_bracket"  # Trostturnier (Consolation Bracket) nach Einfach-KO
    DOUBLE_ELIMINATION = "double_elimination"  # Doppel-KO
    TRIPLE_ELIMINATION = "triple_elimination"  # Triple-KO (Three-Life / Triple Elimination)
    AGGREGATE_KO = "aggregate_ko"  # KO mit Hin- und Rückpiel (Aggregate KO)
    GROUP_THEN_SINGLE_KO = "group_then_single_ko"  # Gruppenphase mit anschließendem Einfach-KO
    GROUP_THEN_DOUBLE_KO = "group_then_double_ko"  # Gruppenphase mit anschließendem Doppel-KO
    KO_WITH_GROUP_WINNER_ADVANTAGE = "ko_with_group_winner_advantage"  # KO mit Vorteil für Gruppensieger
    PAGE_PLAYOFF = "page_playoff"  # Page-Playoff-System


class KODrawMethod(str, enum.Enum):
    """KO Phase Draw Method Enum"""
    FIXED_CROSS = "fixed_cross"  # Feste Kreuzpaarung
    SAME_POSITION_CROSS = "same_position_cross"  # Platzgleiches Kreuzen
    OVERALL_SEEDING = "overall_seeding"  # Gesamt-Seeding (Ranglistenbasiert)
    POT_SYSTEM = "pot_system"  # Topf-System (teilweise Zufall)
    FULL_RANDOM = "full_random"  # Vollzufällige Auslosung mit Sperrregeln
    BONUS_DRAW_FOR_WINNERS = "bonus_draw_for_winners"  # Bonus-Auslosung für Gruppensieger
    PREDEFINED_BRACKET = "predefined_bracket"  # Vorgegebener Turnierbaum
    MANUAL = "manual"  # Manuelle Paarungen


class LeagueScoringSystem(str, enum.Enum):
    """League Scoring System Enum"""
    POINTS = "points"  # Punkte
    DIFFERENCE = "difference"  # Differenz


class LeagueVariant(str, enum.Enum):
    """League Variant Enum"""
    CLASSIC = "classic"      # Klassische Liga (Standard)
    DOUBLE = "double"        # Doppelte Liga
    MULTIPLE = "multiple"    # Mehrfache Liga


class KOStartRound(str, enum.Enum):
    """KO Phase Start Round Enum"""
    ROUND_OF_32 = "round_of_32"  # 32 Teilnehmer
    ROUND_OF_16 = "round_of_16"  # 16 Teilnehmer
    QUARTERFINAL = "quarterfinal"  # 8 Teilnehmer
    SEMIFINAL = "semifinal"  # 4 Teilnehmer
    FINAL = "final"  # 2 Teilnehmer


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
    group_distribution = Column(String(20), default='random', nullable=False)  # 'random' or 'seeded'
    
    # KO Phase Settings
    has_ko_phase = Column(Boolean, default=False, nullable=False)
    ko_participants = Column(Integer, default=0, nullable=False)  # Wie viele aus Gruppenphase (Legacy)
    ko_first_round_size = Column(Integer, default=4, nullable=True)  # 4, 8, 16 (Legacy)
    ko_start_round = Column(Enum(KOStartRound), nullable=True)  # KO-Start-Runde (round_of_32, round_of_16, quarterfinal, semifinal, final)
    ko_fallback_qualifiers = Column(JSON, nullable=True)  # Fallback-Regeln: [{"position": 3, "count": 2, "selection": "best"}]
    ko_distribution = Column(String(20), default='cross', nullable=True)  # Deprecated: kept for backward compatibility
    ko_structure = Column(Enum(KOStructure), nullable=True)  # KO-Phase Struktur
    ko_draw_method = Column(Enum(KODrawMethod), nullable=True)  # Auslosungsmethode
    ko_third_place_match = Column(Boolean, default=False, nullable=False)  # Spiel um Platz 3
    ko_group_winner_advantage = Column(Boolean, default=False, nullable=False)  # Vorteil für Gruppensieger aktiviert
    ko_block_same_group = Column(Boolean, default=True, nullable=False)  # Sperrregel: keine gleiche Gruppe
    ko_block_same_position = Column(Boolean, default=False, nullable=False)  # Sperrregel: keine gleiche Platzierung
    ko_random_seed = Column(Integer, nullable=True)  # Zufalls-Seed für Zufallsauslosungen
    
    # League Scoring Settings
    league_scoring_system = Column(Enum(LeagueScoringSystem), nullable=True)  # Liga-Wertungssystem
    tie_breaking_rules = Column(JSON, nullable=True)  # Gleichstandsregeln als JSON Array
    
    # League Variant Settings
    league_variant = Column(Enum(LeagueVariant), default=LeagueVariant.CLASSIC, nullable=False)  # Liga-Variante
    league_rounds_multiplier = Column(Integer, default=1, nullable=True)  # Multiplikator für mehrfache Liga
    
    # Template Settings
    is_template = Column(Boolean, default=False, nullable=False)  # Ist als Vorlage gespeichert
    
    # Seeded Participants
    seeded_participant_ids = Column(JSON, nullable=True)  # Array von Participant-IDs für gesetzte Spieler
    
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

