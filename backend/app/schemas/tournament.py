# Tournament Schemas - Pydantic Models
# v1.2.0-alpha.2

from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import List, Dict, Any
from app.models.tournament import TournamentMode, TournamentStatus, KOStructure, KODrawMethod, LeagueScoringSystem, LeagueVariant, KOStartRound


class TournamentBase(BaseModel):
    """Base Tournament Schema"""
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    start_date: date
    end_date: date | None = None
    mode: TournamentMode = TournamentMode.ROUND_ROBIN
    has_group_phase: bool = True
    has_ko_phase: bool = False
    league_variant: LeagueVariant | None = LeagueVariant.CLASSIC
    league_rounds_multiplier: int | None = None


class TournamentCreate(TournamentBase):
    """Schema for creating a new tournament"""
    groups_count: int = Field(default=0, ge=0)
    participants_per_group: int | None = Field(default=None, ge=2)
    group_distribution: str = Field(default='random', pattern='^(random|seeded)$')
    ko_participants: int = Field(default=0, ge=0)  # Legacy, kept for backward compatibility
    ko_first_round_size: int | None = Field(default=4, ge=4, le=16)  # Legacy
    ko_start_round: KOStartRound | None = None
    ko_fallback_qualifiers: List[Dict[str, Any]] | None = None  # Format: [{"position": 3, "count": 2, "selection": "best"}]
    ko_distribution: str | None = Field(default='cross', pattern='^(cross|draw|random_first_round|random_each_round|predefined_slots)$')  # Deprecated, kept for backward compatibility
    ko_structure: KOStructure | None = None
    ko_draw_method: KODrawMethod | None = None
    ko_third_place_match: bool = Field(default=False)
    ko_group_winner_advantage: bool = Field(default=False)
    ko_block_same_group: bool = Field(default=True)
    ko_block_same_position: bool = Field(default=False)
    ko_random_seed: int | None = Field(default=None, ge=0)
    league_scoring_system: LeagueScoringSystem | None = Field(default=None)
    tie_breaking_rules: list[str] | None = Field(default=None)
    league_variant: LeagueVariant | None = Field(default=LeagueVariant.CLASSIC)
    league_rounds_multiplier: int | None = Field(default=None)
    is_template: bool = Field(default=False)
    seeded_participant_ids: list[int] | None = Field(default=None)
    show_matches: bool = True
    show_tables: bool = True


class TournamentUpdate(BaseModel):
    """Schema for updating a tournament"""
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: TournamentStatus | None = None
    mode: TournamentMode | None = None
    has_group_phase: bool | None = None
    has_ko_phase: bool | None = None
    groups_count: int | None = Field(default=None, ge=0)
    participants_per_group: int | None = Field(default=None, ge=2)
    group_distribution: str | None = Field(default=None, pattern='^(random|seeded)$')
    ko_participants: int | None = Field(default=None, ge=0)  # Legacy
    ko_first_round_size: int | None = Field(default=None, ge=4, le=16)  # Legacy
    ko_start_round: KOStartRound | None = None
    ko_fallback_qualifiers: List[Dict[str, Any]] | None = None
    ko_distribution: str | None = Field(default=None, pattern='^(cross|draw|random_first_round|random_each_round|predefined_slots)$')
    ko_structure: KOStructure | None = None
    ko_draw_method: KODrawMethod | None = None
    ko_third_place_match: bool | None = None
    ko_group_winner_advantage: bool | None = None
    ko_block_same_group: bool | None = None
    ko_block_same_position: bool | None = None
    ko_random_seed: int | None = Field(default=None, ge=0)
    league_scoring_system: LeagueScoringSystem | None = None
    tie_breaking_rules: list[str] | None = None
    league_variant: LeagueVariant | None = None
    league_rounds_multiplier: int | None = Field(default=None, ge=1, le=10)
    show_matches: bool | None = None
    show_tables: bool | None = None


class TournamentDeleteRequest(BaseModel):
    """Schema for deleting a tournament with password confirmation"""
    password: str = Field(..., min_length=1)


class QualificationManualSelection(BaseModel):
    """Schema for manual qualification selection in fallback rules"""
    position: int = Field(..., ge=1)
    selected_ids: list[int] = Field(default_factory=list)


class TournamentResponse(TournamentBase):
    """Schema for tournament response"""
    id: int
    status: TournamentStatus
    groups_count: int
    participants_per_group: int | None
    group_distribution: str
    ko_participants: int  # Legacy
    ko_first_round_size: int | None  # Legacy
    ko_start_round: KOStartRound | None
    ko_fallback_qualifiers: List[Dict[str, Any]] | None
    ko_distribution: str | None  # Deprecated, kept for backward compatibility
    ko_structure: KOStructure | None
    ko_draw_method: KODrawMethod | None
    ko_third_place_match: bool
    ko_group_winner_advantage: bool
    ko_block_same_group: bool
    ko_block_same_position: bool
    ko_random_seed: int | None
    league_scoring_system: LeagueScoringSystem | None
    tie_breaking_rules: list[str] | None
    league_variant: LeagueVariant | None
    league_rounds_multiplier: int | None
    is_template: bool
    seeded_participant_ids: list[int] | None
    show_matches: bool
    show_tables: bool
    created_at: datetime
    updated_at: datetime
    creator_id: int | None
    
    class Config:
        from_attributes = True

