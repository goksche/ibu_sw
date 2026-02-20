from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, date


class LeagueBase(BaseModel):
    """Base League schema"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    scoring_schema: Optional[Dict[str, int]] = None
    mode_presets: Optional[Dict[str, Any]] = None
    status: Optional[str] = "geplant"
    league_mode: Optional[str] = "liga"
    tournament_mode: Optional[str] = "combined"
    placement_points: Optional[Dict[str, Any]] = None
    masters_ko_count: Optional[int] = 8
    auto_tournament_count: Optional[int] = 0
    auto_tournament_mode: Optional[str] = None
    auto_tournament_settings: Optional[Dict[str, Any]] = None
    season_type: Optional[str] = "year"
    season_year: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class LeagueCreate(LeagueBase):
    """Schema for creating a league"""
    participant_ids: List[int] = Field(default_factory=list)
    tournament_ids: List[int] = Field(default_factory=list)


class LeagueUpdate(BaseModel):
    """Schema for updating a league"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    scoring_schema: Optional[Dict[str, int]] = None
    mode_presets: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    league_mode: Optional[str] = None
    tournament_mode: Optional[str] = None
    placement_points: Optional[Dict[str, Any]] = None
    masters_ko_count: Optional[int] = None
    auto_tournament_count: Optional[int] = None
    auto_tournament_mode: Optional[str] = None
    auto_tournament_settings: Optional[Dict[str, Any]] = None
    season_type: Optional[str] = None
    season_year: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    participant_ids: Optional[List[int]] = None
    tournament_ids: Optional[List[int]] = None


class LeagueParticipantSummary(BaseModel):
    id: int
    first_name: str
    last_name: str


class LeagueTournamentSummary(BaseModel):
    id: int
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None


class LeagueResponse(LeagueBase):
    """Schema for league response"""
    id: int
    participant_ids: List[int] = []
    tournament_ids: List[int] = []
    participants: List[LeagueParticipantSummary] = []
    tournaments: List[LeagueTournamentSummary] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeagueStandingEntry(BaseModel):
    """Single entry in the league standings table"""
    rank: int
    participant_id: int
    first_name: str
    last_name: str
    tournaments_played: int
    total_points: int
    placements: List[Dict[str, Any]] = []


class LeagueStandingsResponse(BaseModel):
    """Full standings response"""
    league_id: int
    league_name: str
    entries: List[LeagueStandingEntry] = []
