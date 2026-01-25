from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, date


class LeagueBase(BaseModel):
    """Base League schema"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    scoring_schema: Optional[Dict[str, int]] = None
    mode_presets: Optional[Dict[str, Any]] = None


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
    participant_ids: Optional[List[int]] = None
    tournament_ids: Optional[List[int]] = None


class LeagueParticipantSummary(BaseModel):
    id: int
    first_name: str
    last_name: str


class LeagueTournamentSummary(BaseModel):
    id: int
    name: str
    start_date: Optional[date]
    end_date: Optional[date]


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
