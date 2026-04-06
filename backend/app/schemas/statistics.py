"""Pydantic schemas for statistics endpoints."""
from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class DateRangeParams(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    preset: Optional[str] = None  # 12m, 6m, 3m, 1m


class ModeCount(BaseModel):
    mode: str
    count: int


class MonthCount(BaseModel):
    month: str  # YYYY-MM
    count: int


class OverviewResponse(BaseModel):
    tournaments_count: int
    matches_count: int
    participants_count: int
    locations_count: int
    completed_tournaments: int
    running_tournaments: int
    planned_tournaments: int
    tournaments_by_mode: List[ModeCount]
    tournaments_by_month: List[MonthCount]
    matches_by_month: List[MonthCount]


class ParticipantStats(BaseModel):
    id: int
    first_name: str
    last_name: str
    club: Optional[str] = None
    tournaments_count: int
    matches_played: int
    wins: int
    losses: int
    draws: int
    goals_for: int
    goals_against: int
    goal_difference: int
    win_rate: float


class ParticipantsRankingResponse(BaseModel):
    participants: List[ParticipantStats]
    total: int


class TournamentHistoryEntry(BaseModel):
    tournament_id: int
    tournament_name: str
    start_date: date
    matches_played: int
    wins: int
    losses: int
    draws: int
    goals_for: int
    goals_against: int


class ParticipantDetailResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    club: Optional[str] = None
    tournaments_count: int
    matches_played: int
    wins: int
    losses: int
    draws: int
    goals_for: int
    goals_against: int
    goal_difference: int
    win_rate: float
    tournament_history: List[TournamentHistoryEntry]


class TournamentStatsEntry(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: Optional[date] = None
    mode: str
    status: str
    participants_count: int
    group_matches_count: int
    ko_matches_count: int
    total_matches: int
    completed_matches: int
    location_name: Optional[str] = None


class TournamentStatsResponse(BaseModel):
    tournaments: List[TournamentStatsEntry]
    total: int
